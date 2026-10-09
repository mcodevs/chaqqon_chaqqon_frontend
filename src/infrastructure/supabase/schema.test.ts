/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addDays, addMonths, isValidPaidUntil, launchPaidUntil, schoolDate } from '@/domain/billing';

/*
 * Runs the real migrations in an embedded Postgres (PGlite) and checks the
 * row-level security rules the way Supabase's API roles would hit them.
 */

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

/** Minimal stand-ins for what the Supabase platform provides. */
const SUPABASE_PLATFORM = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth, public to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create publication supabase_realtime;

  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean not null default false);
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text not null
  );
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant select, insert, update, delete on storage.objects to authenticated;
`;

const TEACHER = '00000000-0000-4000-8000-00000000000a';
/** A second teacher, who joins once the app serves many. */
const TEACHER_B = '00000000-0000-4000-8000-00000000000c';
const ALI = '00000000-0000-4000-8000-0000000000b1';
const VALI = '00000000-0000-4000-8000-0000000000b2';
/** Joins after billing started, so she has no payment. */
const GULI = '00000000-0000-4000-8000-0000000000b3';
/** The second teacher's student. */
const BOBUR = '00000000-0000-4000-8000-0000000000b4';
/** A room and a shop item made while the app still had a single teacher. */
const LEGACY_ROOM = '00000000-0000-4000-8000-0000000000d1';
const LEGACY_ITEM = '00000000-0000-4000-8000-0000000000d2';
const CONFIG = JSON.stringify({ section: 'formulasiz', rowCount: 4, secondsPerNumber: 6, problemCount: 5 });

let db: PGlite;

/** Students added once teachers are tenants name their teacher; the first accounts predate that. */
async function addUser(
  id: string,
  role: 'teacher' | 'student',
  username: string,
  firstName: string,
  teacherId?: string,
) {
  await db.query('insert into auth.users (id) values ($1)', [id]);
  if (teacherId) {
    await db.query(
      'insert into public.profiles (id, role, username, first_name, teacher_id) values ($1, $2, $3, $4, $5)',
      [id, role, username, firstName, teacherId],
    );
  } else {
    await db.query('insert into public.profiles (id, role, username, first_name) values ($1, $2, $3, $4)', [
      id,
      role,
      username,
      firstName,
    ]);
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_PLATFORM);
  const [initialSchema, ...laterMigrations] = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  await db.exec(readFileSync(join(MIGRATIONS_DIR, initialSchema), 'utf8'));
  // The accounts exist before the later migrations, so their data changes (like billing's launch) apply to them.
  await addUser(TEACHER, 'teacher', 'mohira', 'Mohira');
  await addUser(ALI, 'student', 'ali10', 'Ali');
  await addUser(VALI, 'student', 'vali20', 'Vali');
  for (const file of laterMigrations) {
    if (file.includes('teacher_tenancy')) {
      // Rows from the single-teacher days, which the tenancy migration hands to that teacher.
      await db.query(
        `insert into public.rooms (id, status, participant_ids, configs) values ($1, 'finished', $2, '{}')`,
        [LEGACY_ROOM, `{${ALI}}`],
      );
      await db.query(
        `insert into public.market_items (id, title, cost_stars, image_url) values ($1, 'Eski', 1, '🎁')`,
        [LEGACY_ITEM],
      );
    }
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
  }
}, 60_000);

afterAll(async () => {
  await db?.close();
});

/** Runs a statement as a Supabase API role; `userId` becomes `auth.uid()`. */
async function as<T = Record<string, unknown>>(
  role: 'anon' | 'authenticated',
  userId: string | null,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ''}', false); set role ${role};`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    // The claim is cleared too, or the next superuser insert would take this user as its owner.
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}

const today = () => schoolDate(new Date());

const openRoom = (participants: string[], status = 'waiting', teacherId = TEACHER) =>
  `insert into public.rooms (status, participant_ids, configs, teacher_id)
   values ('${status}', '{${participants.join(',')}}', '{}', '${teacherId}') returning id`;

const saveProgress = `
  insert into public.room_progress (room_id, student_id, answered, correct, total, finished)
  values ($1, $2, $3, 0, 5, false)
  on conflict (room_id, student_id) do update set answered = excluded.answered`;

const recordResult =
  'insert into public.practice_results (student_id, config, correct, total) values ($1, $2, 4, 5)';

const recordPayment =
  'insert into public.student_payments (student_id, paid_until) values ($1, $2) returning paid_until::text, kind';

describe('the move to many teachers', () => {
  it('can be applied a second time', async () => {
    const file = readdirSync(MIGRATIONS_DIR).find((name) => name.includes('teacher_tenancy'));
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file!), 'utf8'));
  });

  it('gives everything from the single-teacher days to that teacher', async () => {
    const { rows } = await db.query<{ owner: string }>(`
      select teacher_id as owner from public.profiles where role = 'student'
      union all select teacher_id from public.rooms where id = '${LEGACY_ROOM}'
      union all select teacher_id from public.market_items where id = '${LEGACY_ITEM}'
    `);
    expect(rows).toEqual([{ owner: TEACHER }, { owner: TEACHER }, { owner: TEACHER }, { owner: TEACHER }]);
  });

  it('gives a teacher no teacher of their own, and a student always one', async () => {
    const { rows } = await db.query("select teacher_id from public.profiles where role = 'teacher'");
    expect(rows).toEqual([{ teacher_id: null }]);
    await expect(
      db.query("update public.profiles set teacher_id = null where role = 'student'"),
    ).rejects.toThrow(/must name a teacher/);
    await expect(
      db.query("update public.profiles set teacher_id = $1 where role = 'teacher'", [ALI]),
    ).rejects.toThrow(/profiles_teacher_link/);
  });
});

describe('the star ledger', () => {
  /*
   * These tests write homework and orders of their own, and the suite shares one database, so
   * they clear up after themselves before the row-level security tests count what is there.
   */
  afterAll(async () => {
    await db.exec(`
      delete from public.market_orders;
      delete from public.market_items;
      delete from public.practice_results;
      delete from public.rooms;
    `);
  });

  /** An 'online' result must name its room, so each homework gets one. */
  const homework = async (studentId: string, correct: number, total: number) => {
    const room = await db.query<{ id: string }>(openRoom([`"${studentId}"`], 'finished'));
    return db.query(
      `insert into public.practice_results (student_id, config, correct, total, mode, room_id)
       values ($1, $2, $3, $4, 'online', $5) returning id`,
      [studentId, CONFIG, correct, total, room.rows[0].id],
    );
  };

  const balance = async (studentId: string) =>
    (
      await db.query<{ balance: number }>(
        'select coalesce(sum(delta), 0)::int as balance from public.star_awards where student_id = $1',
        [studentId],
      )
    ).rows[0].balance;

  it('pays a star for a homework answered without a mistake', async () => {
    await homework(ALI, 5, 5);
    expect(await balance(ALI)).toBe(1);
  });

  it('pays nothing for a homework with a slip in it, or for solo practice', async () => {
    await homework(VALI, 4, 5);
    await db.query(
      `insert into public.practice_results (student_id, config, correct, total, mode)
       values ($1, $2, 50, 50, 'practice')`,
      [VALI, CONFIG],
    );
    expect(await balance(VALI)).toBe(0);
  });

  it('charges a purchase and gives it back when the order is cancelled', async () => {
    await homework(ALI, 5, 5);
    await homework(ALI, 5, 5);
    const before = await balance(ALI);

    const item = await db.query<{ id: string }>(
      `insert into public.market_items (title, cost_stars, image_url, teacher_id) values ('Stiker', 2, '🎁', $1)
       returning id`,
      [TEACHER],
    );
    const order = await db.query<{ id: string }>(
      `insert into public.market_orders (student_id, item_id, item_title, cost_stars)
       values ($1, $2, 'Stiker', 2) returning id`,
      [ALI, item.rows[0].id],
    );
    expect(await balance(ALI)).toBe(before - 2);

    await db.query("update public.market_orders set status = 'cancelled' where id = $1", [order.rows[0].id]);
    expect(await balance(ALI)).toBe(before);

    // Reviving the order charges for it again, rather than leaving the gift free.
    await db.query("update public.market_orders set status = 'pending' where id = $1", [order.rows[0].id]);
    expect(await balance(ALI)).toBe(before - 2);
  });

  it("lets a student read their own stars and nobody else's", async () => {
    const seenByVali = await as<{ student_id: string }>(
      'authenticated',
      VALI,
      'select student_id from public.star_awards',
    );
    expect(seenByVali.some((row) => row.student_id === ALI)).toBe(false);

    const seenByTeacher = await as<{ student_id: string }>(
      'authenticated',
      TEACHER,
      'select student_id from public.star_awards',
    );
    expect(seenByTeacher.some((row) => row.student_id === ALI)).toBe(true);
  });

  it('refuses to let a student write themselves a star', async () => {
    await expect(
      as(
        'authenticated',
        VALI,
        "insert into public.star_awards (student_id, delta, reason) values ($1, 99, 'teacher_grant')",
        [VALI],
      ),
    ).rejects.toThrow(/permission denied|row-level security/);
  });
});

describe('database schema and row-level security', () => {
  it('tells guests whether the teacher exists, but shows them nothing else', async () => {
    expect(await as('anon', null, 'select public.teacher_exists() as exists')).toEqual([{ exists: true }]);
    await expect(as('anon', null, 'select id from public.profiles')).rejects.toThrow(/permission denied/);
  });

  it("shows classmates' names but never their usernames", async () => {
    const names = await as(
      'authenticated',
      ALI,
      "select first_name from public.profiles where role = 'student' order by first_name",
    );
    expect(names).toEqual([{ first_name: 'Ali' }, { first_name: 'Vali' }]);
    await expect(as('authenticated', ALI, 'select username from public.profiles')).rejects.toThrow(
      /permission denied/,
    );
  });

  it('lists student accounts for the teacher only', async () => {
    const forTeacher = await as('authenticated', TEACHER, 'select username from public.student_accounts()');
    expect(forTeacher).toEqual([{ username: 'ali10' }, { username: 'vali20' }]);
    expect(await as('authenticated', ALI, 'select username from public.student_accounts()')).toEqual([]);
    await expect(as('anon', null, 'select * from public.student_accounts()')).rejects.toThrow(
      /permission denied/,
    );
  });

  it('keeps RLS helper functions out of the public API', async () => {
    await expect(as('authenticated', TEACHER, 'select public.is_teacher()')).rejects.toThrow(
      /does not exist/,
    );
    await expect(as('anon', null, 'select private.is_teacher()')).rejects.toThrow(/permission denied/);
  });

  it('lets students record only their own results, which everyone can read', async () => {
    await as('authenticated', ALI, recordResult, [ALI, CONFIG]);
    await expect(as('authenticated', ALI, recordResult, [VALI, CONFIG])).rejects.toThrow(
      /row-level security/,
    );
    expect(await as('authenticated', VALI, 'select student_id from public.practice_results')).toEqual([
      { student_id: ALI },
    ]);
  });

  it('lets only the teacher open rooms, allowing multiple active rooms concurrently', async () => {
    await expect(as('authenticated', ALI, openRoom([ALI]))).rejects.toThrow(/row-level security/);

    const [room1] = await as<{ id: string }>('authenticated', TEACHER, openRoom([ALI]));
    const [room2] = await as<{ id: string }>('authenticated', TEACHER, openRoom([VALI]));
    expect(room2.id).not.toBe(room1.id);

    await as('authenticated', TEACHER, "update public.rooms set status = 'finished' where id in ($1, $2)", [
      room1.id,
      room2.id,
    ]);
  });

  it('accepts progress only from participants while the room runs', async () => {
    const [room] = await as<{ id: string }>('authenticated', TEACHER, openRoom([ALI]));

    await expect(as('authenticated', ALI, saveProgress, [room.id, ALI, 1])).rejects.toThrow(
      /row-level security/,
    );

    await as('authenticated', TEACHER, "update public.rooms set status = 'running' where id = $1", [room.id]);
    await as('authenticated', ALI, saveProgress, [room.id, ALI, 1]);
    await as('authenticated', ALI, saveProgress, [room.id, ALI, 2]);
    await expect(as('authenticated', VALI, saveProgress, [room.id, VALI, 1])).rejects.toThrow(
      /row-level security/,
    );

    const progressSql = 'select answered from public.room_progress where room_id = $1';
    expect(await as('authenticated', TEACHER, progressSql, [room.id])).toEqual([{ answered: 2 }]);
    expect(await as('authenticated', ALI, progressSql, [room.id])).toEqual([{ answered: 2 }]);
    expect(await as('authenticated', VALI, progressSql, [room.id])).toEqual([]);
    expect(await as('authenticated', VALI, 'select id from public.rooms where id = $1', [room.id])).toEqual(
      [],
    );

    await as('authenticated', TEACHER, "update public.rooms set status = 'finished' where id = $1", [
      room.id,
    ]);
    await expect(as('authenticated', ALI, saveProgress, [room.id, ALI, 3])).rejects.toThrow(
      /row-level security/,
    );
  });

  it('lets only the teacher record classroom matches, and only for students', async () => {
    const insert =
      'insert into public.practice_results (student_id, config, correct, total, mode) values ($1, $2, 3, 5, $3)';
    await as('authenticated', TEACHER, insert, [VALI, CONFIG, 'classroom']);

    await expect(as('authenticated', TEACHER, insert, [TEACHER, CONFIG, 'classroom'])).rejects.toThrow(
      /row-level security/,
    );
    await expect(as('authenticated', TEACHER, insert, [VALI, CONFIG, 'practice'])).rejects.toThrow(
      /row-level security/,
    );
    await expect(as('authenticated', VALI, insert, [VALI, CONFIG, 'classroom'])).rejects.toThrow(
      /row-level security/,
    );
    await expect(as('authenticated', VALI, insert, [VALI, CONFIG, 'online'])).rejects.toThrow(
      /practice_results_room_matches_mode/,
    );
  });

  it('gives students who existed before billing the rest of the month', async () => {
    const { rows } = await db.query(
      'select student_id, paid_until::text as paid_until, kind from public.student_payments order by student_id',
    );
    const paidUntil = launchPaidUntil(today());
    expect(rows).toEqual([
      { student_id: ALI, paid_until: paidUntil, kind: 'launch' },
      { student_id: VALI, paid_until: paidUntil, kind: 'launch' },
    ]);
  });

  it('accepts the same access days as the app: from tomorrow up to 24 months ahead', async () => {
    const day = today();
    for (const paidUntil of [day, addDays(day, 1), addMonths(day, 24), addDays(addMonths(day, 24), 1)]) {
      const accepted = await as('authenticated', TEACHER, recordPayment, [VALI, paidUntil]).then(
        () => true,
        () => false,
      );
      expect(accepted, paidUntil).toBe(isValidPaidUntil(paidUntil, day));
    }
    await db.query("delete from public.student_payments where student_id = $1 and kind = 'payment'", [VALI]);
  });

  it('keeps a student without a payment out of everything but their own profile', async () => {
    await addUser(GULI, 'student', 'guli30', 'Guli', TEACHER);

    expect(await as('authenticated', GULI, 'select first_name from public.profiles')).toEqual([
      { first_name: 'Guli' },
    ]);
    expect(await as('authenticated', GULI, 'select id from public.practice_results')).toEqual([]);
    await expect(as('authenticated', GULI, recordResult, [GULI, CONFIG])).rejects.toThrow(
      /row-level security/,
    );

    expect(await as('authenticated', GULI, 'select id from public.student_payments')).toEqual([]);

    // Payments never limit the teacher, but a closed student can neither see nor play the room.
    const [room] = await as<{ id: string }>('authenticated', TEACHER, openRoom([GULI], 'running'));
    expect(await as('authenticated', GULI, 'select id from public.rooms')).toEqual([]);
    await expect(as('authenticated', GULI, saveProgress, [room.id, GULI, 1])).rejects.toThrow(
      /row-level security/,
    );
    await as('authenticated', TEACHER, "update public.rooms set status = 'finished' where id = $1", [
      room.id,
    ]);
  });

  it('lets only the teacher record payments, and only for students', async () => {
    const inFourMonths = addMonths(today(), 4);
    await expect(as('authenticated', GULI, recordPayment, [GULI, inFourMonths])).rejects.toThrow(
      /row-level security/,
    );
    await expect(as('authenticated', TEACHER, recordPayment, [TEACHER, inFourMonths])).rejects.toThrow(
      /row-level security/,
    );
    await expect(
      as(
        'authenticated',
        TEACHER,
        "insert into public.student_payments (student_id, paid_until, kind) values ($1, $2, 'launch')",
        [GULI, inFourMonths],
      ),
    ).rejects.toThrow(/permission denied/);

    expect(await as('authenticated', TEACHER, recordPayment, [GULI, inFourMonths])).toEqual([
      { paid_until: inFourMonths, kind: 'payment' },
    ]);

    await as('authenticated', GULI, recordResult, [GULI, CONFIG]);
    // Her own class: the three students. The teacher's row is not part of it.
    expect(await as('authenticated', GULI, 'select count(*)::int as count from public.profiles')).toEqual([
      { count: 3 },
    ]);
    expect(await as('authenticated', ALI, 'select student_id from public.student_payments')).toEqual([
      { student_id: ALI },
    ]);
  });

  it('lets the latest payment decide, even when it ends earlier', async () => {
    const guliHasAccess = async () =>
      (await db.query<{ open: boolean }>('select private.has_access($1) as open', [GULI])).rows[0].open;
    expect(await guliHasAccess()).toBe(true);

    await db.query(
      "insert into public.student_payments (student_id, paid_until, recorded_at) values ($1, $2, now() + interval '1 minute')",
      [GULI, today()],
    );
    expect(await guliHasAccess()).toBe(false);
  });

  it('lets only the teacher take a payment back, so the one before counts again', async () => {
    const deleteLatest = `
      delete from public.student_payments
      where id = (select id from public.student_payments where student_id = $1 order by recorded_at desc limit 1)
      returning id`;

    expect(await as('authenticated', GULI, deleteLatest, [GULI])).toEqual([]);
    expect(await as('authenticated', TEACHER, deleteLatest, [GULI])).toHaveLength(1);
    await as('authenticated', GULI, recordResult, [GULI, CONFIG]);

    expect(await as('authenticated', TEACHER, deleteLatest, [GULI])).toHaveLength(1);
    await expect(as('authenticated', GULI, recordResult, [GULI, CONFIG])).rejects.toThrow(
      /row-level security/,
    );
  });

  it("still lets the teacher finish a room after a participant's access has ended", async () => {
    const [room] = await as<{ id: string }>('authenticated', TEACHER, openRoom([VALI], 'running'));
    await db.query('delete from public.student_payments where student_id = $1', [VALI]);

    expect(await as('authenticated', VALI, 'select id from public.rooms where id = $1', [room.id])).toEqual(
      [],
    );
    await expect(as('authenticated', VALI, saveProgress, [room.id, VALI, 1])).rejects.toThrow(
      /row-level security/,
    );

    // The app saves rooms with an upsert, which takes the update path for an existing room.
    await as(
      'authenticated',
      TEACHER,
      `insert into public.rooms (id, status, participant_ids, configs) values ($1, 'finished', $2, '{}')
       on conflict (id) do update set status = excluded.status`,
      [room.id, `{${VALI}}`],
    );
    expect(
      await as('authenticated', TEACHER, 'select status from public.rooms where id = $1', [room.id]),
    ).toEqual([{ status: 'finished' }]);
  });

  it("removes a student's data together with the account", async () => {
    await db.exec(`delete from auth.users where id = '${ALI}'`);
    const counts = await db.query<{ profiles: number; results: number; progress: number; payments: number }>(`
      select
        (select count(*)::int from public.profiles where id = '${ALI}') as profiles,
        (select count(*)::int from public.practice_results where student_id = '${ALI}') as results,
        (select count(*)::int from public.room_progress where student_id = '${ALI}') as progress,
        (select count(*)::int from public.student_payments where student_id = '${ALI}') as payments
    `);
    expect(counts.rows).toEqual([{ profiles: 0, results: 0, progress: 0, payments: 0 }]);
  });
});

describe('teachers as tenants', () => {
  /*
   * A second teacher joins with a student of her own. By now Ali is gone, and Vali and Guli are the
   * first teacher's students; Vali pays again so both classes have a paid student.
   */
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    await addUser(TEACHER_B, 'teacher', 'bahrom', 'Bahrom');
    await addUser(BOBUR, 'student', 'bobur40', 'Bobur', TEACHER_B);

    const inAMonth = addMonths(today(), 1);
    for (const student of [VALI, BOBUR]) {
      await db.query(
        "insert into public.student_payments (student_id, paid_until, recorded_at) values ($1, $2, now() + interval '1 hour')",
        [student, inAMonth],
      );
    }

    const one = async (sql: string, params: unknown[] = []) =>
      (await db.query<{ id: string }>(sql, params)).rows[0].id;

    ids.roomA = await one(openRoom([VALI], 'running', TEACHER));
    ids.roomB = await one(openRoom([BOBUR], 'running', TEACHER_B));
    ids.itemA = await one(
      `insert into public.market_items (title, cost_stars, image_url, teacher_id)
       values ('Ruchka', 3, '🖊', $1) returning id`,
      [TEACHER],
    );
    ids.itemB = await one(
      `insert into public.market_items (title, cost_stars, image_url, teacher_id)
       values ('Daftar', 2, '📒', $1) returning id`,
      [TEACHER_B],
    );
    ids.orderA = await one(
      `insert into public.market_orders (student_id, item_id, item_title, cost_stars)
       values ($1, $2, 'Ruchka', 3) returning id`,
      [VALI, ids.itemA],
    );
    for (const student of [VALI, BOBUR]) {
      await db.query(recordResult, [student, CONFIG]);
      await db.query('insert into public.written_homework (student_id, status) values ($1, $2)', [
        student,
        'bajardi',
      ]);
    }
  });

  const studentsSeenBy = async (userId: string, sql: string) =>
    (await as<{ student_id: string }>('authenticated', userId, sql)).map((row) => row.student_id).sort();

  it("keeps every teacher's class to themselves", async () => {
    const profiles = await as<{ id: string }>('authenticated', TEACHER_B, 'select id from public.profiles');
    expect(profiles.map((row) => row.id).sort()).toEqual([TEACHER_B, BOBUR].sort());
    expect(await as('authenticated', TEACHER_B, 'select username from public.student_accounts()')).toEqual([
      { username: 'bobur40' },
    ]);

    for (const table of ['practice_results', 'student_payments', 'written_homework']) {
      expect(
        await studentsSeenBy(TEACHER_B, `select distinct student_id from public.${table}`),
        table,
      ).toEqual([BOBUR]);
      expect(
        await studentsSeenBy(TEACHER, `select distinct student_id from public.${table}`),
        table,
      ).not.toContain(BOBUR);
    }
    expect(await as('authenticated', TEACHER_B, 'select id from public.rooms')).toEqual([{ id: ids.roomB }]);
    expect(await as('authenticated', TEACHER_B, 'select id from public.market_items')).toEqual([
      { id: ids.itemB },
    ]);
    expect(await as('authenticated', TEACHER_B, 'select id from public.market_orders')).toEqual([]);
    expect(await as('authenticated', TEACHER_B, 'select id from public.star_awards')).toEqual([]);

    const teacherAProfiles = await as<{ id: string }>(
      'authenticated',
      TEACHER,
      'select id from public.profiles',
    );
    expect(teacherAProfiles.map((row) => row.id)).not.toContain(BOBUR);
  });

  it("refuses a teacher every write into another teacher's class", async () => {
    const rls = /row-level security/;
    await expect(
      as('authenticated', TEACHER_B, recordPayment, [VALI, addMonths(today(), 2)]),
    ).rejects.toThrow(rls);
    expect(
      await as(
        'authenticated',
        TEACHER_B,
        'delete from public.student_payments where student_id = $1 returning id',
        [VALI],
      ),
    ).toEqual([]);
    expect(
      await as(
        'authenticated',
        TEACHER_B,
        "update public.profiles set first_name = 'X' where id = $1 returning id",
        [VALI],
      ),
    ).toEqual([]);
    await expect(
      as('authenticated', TEACHER_B, "select public.update_student_profile($1, 'X')", [VALI]),
    ).rejects.toThrow(/Unauthorized/);
    await expect(
      as(
        'authenticated',
        TEACHER_B,
        "insert into public.written_homework (student_id, status) values ($1, 'chala')",
        [VALI],
      ),
    ).rejects.toThrow(rls);
    await expect(
      as(
        'authenticated',
        TEACHER_B,
        "insert into public.practice_results (student_id, config, correct, total, mode) values ($1, $2, 3, 5, 'classroom')",
        [VALI, CONFIG],
      ),
    ).rejects.toThrow(rls);

    // Rooms: not with someone else's student, not in someone else's name, not someone else's room.
    await expect(as('authenticated', TEACHER_B, openRoom([VALI], 'waiting', TEACHER_B))).rejects.toThrow(rls);
    await expect(as('authenticated', TEACHER_B, openRoom([BOBUR], 'waiting', TEACHER))).rejects.toThrow(rls);
    expect(
      await as(
        'authenticated',
        TEACHER_B,
        "update public.rooms set status = 'finished' where id = $1 returning id",
        [ids.roomA],
      ),
    ).toEqual([]);
    await expect(
      as(
        'authenticated',
        TEACHER_B,
        `insert into public.rooms (id, status, participant_ids, configs) values ($1, 'finished', $2, '{}')
         on conflict (id) do update set status = excluded.status`,
        [ids.roomA, `{${BOBUR}}`],
      ),
    ).rejects.toThrow(rls);

    // The shop.
    await expect(
      as(
        'authenticated',
        TEACHER_B,
        "insert into public.market_items (title, cost_stars, image_url, teacher_id) values ('X', 1, '🎁', $1)",
        [TEACHER],
      ),
    ).rejects.toThrow(rls);
    expect(
      await as(
        'authenticated',
        TEACHER_B,
        'update public.market_items set cost_stars = 1 where id = $1 returning id',
        [ids.itemA],
      ),
    ).toEqual([]);
    expect(
      await as(
        'authenticated',
        TEACHER_B,
        "update public.market_orders set status = 'delivered' where id = $1 returning id",
        [ids.orderA],
      ),
    ).toEqual([]);
  });

  it("shows a paid student only their own class and their own teacher's shop", async () => {
    expect(await as('authenticated', BOBUR, 'select id from public.profiles')).toEqual([{ id: BOBUR }]);
    expect(await studentsSeenBy(BOBUR, 'select student_id from public.practice_results')).toEqual([BOBUR]);
    expect(await as('authenticated', BOBUR, 'select id from public.market_items')).toEqual([
      { id: ids.itemB },
    ]);

    const order = `insert into public.market_orders (student_id, item_id, item_title, cost_stars)
                   values ($1, $2, 'X', $3)`;
    await expect(as('authenticated', BOBUR, order, [BOBUR, ids.itemA, 3])).rejects.toThrow(
      /row-level security/,
    );
    await expect(as('authenticated', BOBUR, order, [BOBUR, ids.itemB, 1])).rejects.toThrow(
      /row-level security/,
    );

    const valiSees = await studentsSeenBy(VALI, 'select id as student_id from public.profiles');
    expect(valiSees).not.toContain(BOBUR);
  });

  it("tells the student's own teacher on Telegram", async () => {
    // A stand-in for the real dispatcher, which needs pg_net and Vault.
    await db.exec(`
      create table private.sent_notifications (profile_id uuid, text text);
      create or replace function private.notify_telegram(p_profile_id uuid, p_text text)
      returns void language sql security definer set search_path = '' as $fn$
        insert into private.sent_notifications values (p_profile_id, p_text);
      $fn$;
    `);
    const told = async () =>
      (await db.query<{ profile_id: string }>('select profile_id from private.sent_notifications')).rows.map(
        (row) => row.profile_id,
      );

    await as(
      'authenticated',
      BOBUR,
      `insert into public.market_orders (student_id, item_id, item_title, cost_stars) values ($1, $2, 'Daftar', 2)`,
      [BOBUR, ids.itemB],
    );
    expect(await told()).toEqual([BOBUR, TEACHER_B]);

    await db.exec('delete from private.sent_notifications');
    await as(
      'authenticated',
      BOBUR,
      `insert into public.room_progress (room_id, student_id, answered, correct, total, finished)
       values ($1, $2, 5, 5, 5, true)`,
      [ids.roomB, BOBUR],
    );
    expect(await told()).toEqual([TEACHER_B]);
  });

  it("keeps every uploaded file under its owner's id", async () => {
    const upload = 'insert into storage.objects (bucket_id, name) values ($1, $2)';
    await expect(as('authenticated', BOBUR, upload, ['avatars', `${VALI}/1.jpg`])).rejects.toThrow(
      /row-level security/,
    );
    await as('authenticated', BOBUR, upload, ['avatars', `${BOBUR}/1.jpg`]);

    await expect(as('authenticated', TEACHER_B, upload, ['market', `${TEACHER}/1.jpg`])).rejects.toThrow(
      /row-level security/,
    );
    await as('authenticated', TEACHER_B, upload, ['market', `${TEACHER_B}/1.jpg`]);
    await expect(as('authenticated', BOBUR, upload, ['market', `${BOBUR}/1.jpg`])).rejects.toThrow(
      /row-level security/,
    );
  });

  it('makes new rooms and items belong to the teacher who creates them', async () => {
    expect(
      await as(
        'authenticated',
        TEACHER_B,
        `insert into public.rooms (status, participant_ids, configs) values ('finished', $1, '{}') returning teacher_id`,
        [`{${BOBUR}}`],
      ),
    ).toEqual([{ teacher_id: TEACHER_B }]);
    expect(
      await as(
        'authenticated',
        TEACHER_B,
        "insert into public.market_items (title, cost_stars, image_url) values ('Qalam', 1, '✏️') returning teacher_id",
      ),
    ).toEqual([{ teacher_id: TEACHER_B }]);
  });

  it('gives guests nothing and never lets the app move a student to another teacher', async () => {
    for (const table of ['market_items', 'market_orders', 'star_awards', 'written_homework']) {
      await expect(as('anon', null, `select id from public.${table}`), table).rejects.toThrow(
        /permission denied/,
      );
    }
    await expect(
      as('authenticated', TEACHER, 'update public.profiles set teacher_id = $1 where id = $2', [
        TEACHER_B,
        VALI,
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      addUser('00000000-0000-4000-8000-0000000000b5', 'student', 'nobody', 'X', VALI),
    ).rejects.toThrow(/must name a teacher/);
  });
});
