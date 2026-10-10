/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addDays, addMonths, isValidPaidUntil, launchPaidUntil, schoolDate } from '@/domain/billing';
import {
  FEATURES,
  type LedgerEntry,
  balanceOf,
  chargeDates,
  isBlocked,
  overdueSince,
} from '@/domain/teacherBilling';
import { formatSom } from '@/shared/format';

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
  role: 'admin' | 'teacher' | 'student',
  username: string,
  firstName: string,
  teacherId?: string,
) {
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await insertProfile(id, role, username, firstName, teacherId);
  // Once the platform exists, a teacher also has a platform row; the free legacy tariff opens everything.
  const platform = await db.query<{ exists: boolean }>(
    "select to_regclass('public.teachers') is not null as exists",
  );
  if (role === 'teacher' && platform.rows[0].exists) {
    await db.query(
      "insert into public.teachers (profile_id, tariff_id) select $1, id from public.tariffs where name = 'Legacy'",
      [id],
    );
  }
}

async function insertProfile(
  id: string,
  role: 'admin' | 'teacher' | 'student',
  username: string,
  firstName: string,
  teacherId?: string,
) {
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
  it('can be applied a second time, in order with the migrations after it', async () => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith('.sql'))
      .sort();
    for (const file of files.slice(files.findIndex((name) => name.includes('teacher_tenancy')))) {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
    }
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
       values ('Daftar', 1, '📒', $1) returning id`,
      [TEACHER_B],
    );
    ids.orderA = await one(
      `insert into public.market_orders (student_id, item_id, item_title, cost_stars)
       values ($1, $2, 'Ruchka', 3) returning id`,
      [VALI, ids.itemA],
    );
    // A perfect homework: Bobur's one star.
    await db.query(
      `insert into public.practice_results (student_id, config, correct, total, mode, room_id)
       values ($1, $2, 5, 5, 'online', $3)`,
      [BOBUR, CONFIG, ids.roomB],
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
    expect(await studentsSeenBy(TEACHER_B, 'select student_id from public.star_awards')).toEqual([BOBUR]);

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
    expect(await studentsSeenBy(BOBUR, 'select distinct student_id from public.practice_results')).toEqual([
      BOBUR,
    ]);
    expect(await as('authenticated', BOBUR, 'select id from public.market_items')).toEqual([
      { id: ids.itemB },
    ]);

    // Orders only go through place_order, which knows nothing of another teacher's shop.
    await expect(
      as(
        'authenticated',
        BOBUR,
        "insert into public.market_orders (student_id, item_id, item_title, cost_stars) values ($1, $2, 'X', 1)",
        [BOBUR, ids.itemB],
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(as('authenticated', BOBUR, 'select public.place_order($1)', [ids.itemA])).rejects.toThrow(
      /ITEM_NOT_FOUND/,
    );

    const valiSees = await studentsSeenBy(VALI, 'select id as student_id from public.profiles');
    expect(valiSees).not.toContain(BOBUR);
  });

  it("tells the student's own teacher on Telegram", async () => {
    // A stand-in for the real dispatcher, which needs pg_net and Vault.
    await db.exec(`
      create table private.sent_notifications (profile_id uuid, text text);
      create or replace function private.send_telegram(p_profile_id uuid, p_text text)
      returns void language sql security definer set search_path = '' as $fn$
        insert into private.sent_notifications values (p_profile_id, p_text);
      $fn$;
    `);
    const told = async () =>
      (await db.query<{ profile_id: string }>('select profile_id from private.sent_notifications')).rows.map(
        (row) => row.profile_id,
      );

    await as('authenticated', BOBUR, 'select public.place_order($1)', [ids.itemB]);
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

describe('the platform: tariffs, the teacher balance and the superadmin', () => {
  const ADMIN = '00000000-0000-4000-8000-0000000000e1';
  /** A teacher on a small tariff: two students, the leaderboard only. */
  const TEACHER_C = '00000000-0000-4000-8000-00000000000e';
  /** A teacher whose ledger the cross-checks rewrite freely. */
  const TEACHER_X = '00000000-0000-4000-8000-00000000000f';
  const CAMOL = '00000000-0000-4000-8000-0000000000b6';
  const CAMOL2 = '00000000-0000-4000-8000-0000000000b7';
  const tariffs: Record<string, string> = {};

  const one = async <T = { id: string }>(sql: string, params: unknown[] = []) =>
    (await db.query<T>(sql, params)).rows[0];

  beforeAll(async () => {
    await addUser(ADMIN, 'admin', 'boss', 'Admin');
    tariffs.start = (
      await one(
        `insert into public.tariffs (name, monthly_price, max_students, features, is_public)
         values ('Start', 100000, 2, '{leaderboard}', true) returning id`,
      )
    ).id;
    tariffs.old = (
      await one(
        `insert into public.tariffs (name, monthly_price, features, is_public, archived_at)
         values ('Old', 50000, '{}', true, now()) returning id`,
      )
    ).id;
    tariffs.x = (
      await one("insert into public.tariffs (name, monthly_price) values ('X', 100) returning id")
    ).id;

    await addUser(TEACHER_C, 'teacher', 'camila', 'Camila');
    await db.query('update public.teachers set tariff_id = $1 where profile_id = $2', [
      tariffs.start,
      TEACHER_C,
    ]);
    await addUser(TEACHER_X, 'teacher', 'xtest', 'X');
    await db.query('update public.teachers set tariff_id = $1 where profile_id = $2', [tariffs.x, TEACHER_X]);
  });

  const resetLedger = async (teacherId: string) =>
    db.query('delete from public.teacher_ledger where teacher_id = $1', [teacherId]);

  const told = async (profileId: string) =>
    (
      await db.query<{ text: string }>('select text from private.sent_notifications where profile_id = $1', [
        profileId,
      ])
    ).rows.map((row) => row.text);

  it('takes the same monthly charges as the app', async () => {
    for (const anchor of ['2026-01-31', '2028-01-31', '2026-08-31', '2026-03-30']) {
      const days = [
        addDays(anchor, -1),
        anchor,
        addDays(addMonths(anchor, 1), -1),
        addMonths(anchor, 1),
        addMonths(anchor, 13),
      ];
      for (const day of days) {
        await resetLedger(TEACHER_X);
        await db.query('update public.teachers set billing_starts_on = $1 where profile_id = $2', [
          anchor,
          TEACHER_X,
        ]);
        await db.query('select private.generate_teacher_charges($1::date, $2)', [day, TEACHER_X]);
        const { rows } = await db.query<{ period: string }>(
          'select period_start::text as period from public.teacher_ledger where teacher_id = $1 order by period_start',
          [TEACHER_X],
        );
        expect(
          rows.map((row) => row.period),
          `${anchor} on ${day}`,
        ).toEqual(chargeDates(anchor, day));
      }
    }
  });

  it('takes a month once, at the price it had then', async () => {
    await resetLedger(TEACHER_X);
    await db.query("update public.teachers set billing_starts_on = '2026-01-15' where profile_id = $1", [
      TEACHER_X,
    ]);
    const generate = (day: string) =>
      db.query('select private.generate_teacher_charges($1::date, $2)', [day, TEACHER_X]);
    await generate('2026-03-20');
    await generate('2026-03-20');
    await db.query('update public.tariffs set monthly_price = 200 where id = $1', [tariffs.x]);
    await generate('2026-04-20');

    const { rows } = await db.query<{ amount: number }>(
      'select amount::int from public.teacher_ledger where teacher_id = $1 order by period_start',
      [TEACHER_X],
    );
    expect(rows.map((row) => row.amount)).toEqual([-100, -100, -100, -200]);
  });

  it('agrees with the app on the balance, the debt and the block', async () => {
    const charge = (periodStart: string, amount = 100) => ({
      kind: 'charge' as const,
      amount: -amount,
      periodStart,
    });
    const credit = (kind: 'payment' | 'bonus' | 'adjustment', amount: number) => ({
      kind,
      amount,
      periodStart: null,
    });
    const scenarios = [
      [credit('payment', 300), charge('2026-01-05'), charge('2026-02-05')],
      [credit('payment', 200), charge('2026-01-05'), charge('2026-02-05')],
      [credit('payment', 150), charge('2026-01-05'), charge('2026-02-05'), charge('2026-03-05')],
      [credit('bonus', 100), credit('payment', 50), charge('2026-01-10'), charge('2026-02-10')],
      [credit('payment', 100), charge('2026-01-05'), credit('adjustment', -100)],
      [charge('2026-01-05')],
    ];

    for (const [index, scenario] of scenarios.entries()) {
      await resetLedger(TEACHER_X);
      for (const row of scenario) {
        await db.query(
          'insert into public.teacher_ledger (teacher_id, kind, amount, period_start) values ($1, $2, $3, $4)',
          [TEACHER_X, row.kind, row.amount, row.periodStart],
        );
      }
      const entries = scenario.map((row, i) => ({
        ...row,
        id: String(i),
        teacherId: TEACHER_X,
        tariffId: null,
        note: '',
        createdAt: '',
      })) satisfies LedgerEntry[];
      const since = overdueSince(entries);
      for (const day of since ? [addDays(since, 6), addDays(since, 7)] : ['2026-06-01']) {
        const [state] = (
          await db.query<{ balance: number; overdue_since: string | null; blocked: boolean }>(
            'select balance::int, overdue_since::text, blocked from private.teacher_billing_state($1, $2::date)',
            [TEACHER_X, day],
          )
        ).rows;
        expect(state, `scenario ${index} on ${day}`).toEqual({
          balance: balanceOf(entries),
          overdue_since: since,
          blocked: isBlocked(since, day),
        });
      }
    }
  });

  it('accepts exactly the features the app knows', async () => {
    await db.query("insert into public.tariffs (name, monthly_price, features) values ('All', 1, $1)", [
      FEATURES,
    ]);
    await expect(
      db.query("insert into public.tariffs (name, monthly_price, features) values ('Bad', 1, '{bogus}')"),
    ).rejects.toThrow(/tariffs_features_check/);
  });

  it('writes money the way the app does', async () => {
    for (const amount of [0, 999, 150_000, -1_500_000]) {
      const { rows } = await db.query<{ text: string }>('select private.format_som($1) as text', [amount]);
      expect(rows[0].text).toBe(formatSom(amount));
    }
  });

  it("keeps a teacher to their tariff's student limit", async () => {
    await addUser(CAMOL, 'student', 'camol1', 'Camol', TEACHER_C);
    await addUser(CAMOL2, 'student', 'camol2', 'Camol', TEACHER_C);
    await expect(
      addUser('00000000-0000-4000-8000-0000000000b8', 'student', 'camol3', 'Camol', TEACHER_C),
    ).rejects.toThrow(/STUDENT_LIMIT/);
  });

  it('keeps every section the tariff does not include closed, for the teacher and the students', async () => {
    await db.query(
      "insert into public.student_payments (student_id, paid_until, recorded_at) values ($1, $2, now() + interval '2 hours')",
      [CAMOL, addMonths(today(), 1)],
    );
    const item = await one(
      "insert into public.market_items (title, cost_stars, image_url, teacher_id) values ('Q', 1, 'Q', $1) returning id",
      [TEACHER_C],
    );
    const rls = /row-level security/;

    await expect(as('authenticated', TEACHER_C, openRoom([CAMOL], 'waiting', TEACHER_C))).rejects.toThrow(
      rls,
    );
    await expect(
      as(
        'authenticated',
        TEACHER_C,
        "insert into public.market_items (title, cost_stars, image_url) values ('X', 1, 'X')",
      ),
    ).rejects.toThrow(rls);
    await expect(
      as(
        'authenticated',
        TEACHER_C,
        "insert into public.written_homework (student_id, status) values ($1, 'chala')",
        [CAMOL],
      ),
    ).rejects.toThrow(rls);
    await expect(
      as(
        'authenticated',
        TEACHER_C,
        "insert into public.practice_results (student_id, config, correct, total, mode) values ($1, $2, 3, 5, 'classroom')",
        [CAMOL, CONFIG],
      ),
    ).rejects.toThrow(rls);
    await expect(as('authenticated', CAMOL, 'select public.place_order($1)', [item.id])).rejects.toThrow(
      /FEATURE_DISABLED/,
    );

    // What is always open stays open.
    await as('authenticated', TEACHER_C, recordPayment, [CAMOL2, addMonths(today(), 1)]);

    expect(await as('authenticated', CAMOL, 'select public.my_features() as f')).toEqual([
      { f: ['leaderboard'] },
    ]);
    expect(await as('authenticated', TEACHER_C, 'select public.my_features() as f')).toEqual([
      { f: ['leaderboard'] },
    ]);
    expect(await as('authenticated', ADMIN, 'select public.my_features() as f')).toEqual([
      { f: [...FEATURES] },
    ]);
  });

  it('sends class notifications only on a tariff with Telegram', async () => {
    await db.exec('delete from private.sent_notifications');
    await db.query("insert into public.written_homework (student_id, status) values ($1, 'bajardi')", [
      CAMOL2,
    ]);
    await db.query(
      "insert into public.written_homework (student_id, status, date) values ($1, 'bajardi', '2026-01-01')",
      [BOBUR],
    );
    expect(await told(CAMOL2)).toEqual([]);
    expect(await told(BOBUR)).toHaveLength(1);
  });

  it('gives the teacher their own account: tariff, class size and ledger', async () => {
    const [{ account }] = await as<{
      account: { tariff: { name: string }; studentCount: number; ledger: unknown[] };
    }>('authenticated', TEACHER_C, 'select public.my_teacher_account() as account');
    expect(account.tariff.name).toBe('Start');
    expect(account.studentCount).toBe(2);
    expect(account.ledger).toEqual([]);
    await expect(as('authenticated', CAMOL, 'select public.my_teacher_account()')).rejects.toThrow(
      /FORBIDDEN/,
    );
  });

  it('blocks management seven days into a debt, but never the students', async () => {
    await db.query('update public.teachers set billing_starts_on = $1 where profile_id = $2', [
      addDays(today(), -10),
      TEACHER_C,
    ]);
    await db.query('select private.generate_teacher_charges(private.school_today(), $1)', [TEACHER_C]);
    const rls = /row-level security/;

    await expect(
      as('authenticated', TEACHER_C, recordPayment, [CAMOL, addMonths(today(), 2)]),
    ).rejects.toThrow(rls);
    await expect(
      as('authenticated', TEACHER_C, "update public.profiles set first_name = 'X' where id = $1", [CAMOL]),
    ).rejects.toThrow(rls);
    await expect(
      as('authenticated', TEACHER_C, "select public.update_student_profile($1, 'X')", [CAMOL]),
    ).rejects.toThrow(/TEACHER_BLOCKED/);
    await expect(
      addUser('00000000-0000-4000-8000-0000000000b9', 'student', 'camol4', 'Camol', TEACHER_C),
    ).rejects.toThrow(/TEACHER_BLOCKED/);

    // Reading stays open, so the lock page works; the students keep practising.
    const seen = await as<{ id: string }>(
      'authenticated',
      TEACHER_C,
      "select id from public.profiles where role = 'student'",
    );
    expect(seen.map((row) => row.id).sort()).toEqual([CAMOL, CAMOL2].sort());
    await as('authenticated', CAMOL, recordResult, [CAMOL, CONFIG]);

    // The admin records the payment and management opens at once.
    await as(
      'authenticated',
      ADMIN,
      "insert into public.teacher_ledger (teacher_id, kind, amount, note) values ($1, 'payment', 100000, 'naqd')",
      [TEACHER_C],
    );
    await as('authenticated', TEACHER_C, recordPayment, [CAMOL, addMonths(today(), 2)]);
    expect(await told(TEACHER_C)).toEqual([`✅ <b>To'lov qabul qilindi</b>\n+100 000 so'm\nBalans: 0 so'm`]);
  });

  it('reminds an overdue teacher once per step, with the contact to pay', async () => {
    await db.query(
      "update public.platform_settings set contact_phone = '+998901234567', contact_telegram = '@chaqqon'",
    );
    await resetLedger(TEACHER_X);
    await db.query("update public.teachers set billing_starts_on = '2026-01-05' where profile_id = $1", [
      TEACHER_X,
    ]);
    await db.query(
      "insert into public.teacher_ledger (teacher_id, kind, amount, period_start) values ($1, 'charge', -200, '2026-01-05')",
      [TEACHER_X],
    );
    await db.exec('delete from private.sent_notifications');
    const remind = (day: string) => db.query('select private.send_billing_reminders($1::date)', [day]);

    await remind('2026-01-05');
    await remind('2026-01-05');
    let messages = await told(TEACHER_X);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("Balans: −200 so'm");
    expect(messages[0]).toContain('12.01.2026 gacha');
    expect(messages[0]).toContain("📞 To'lov uchun: +998901234567 · @chaqqon");

    await remind('2026-01-09');
    await remind('2026-01-11');
    await remind('2026-01-12');
    await remind('2026-01-13');
    messages = await told(TEACHER_X);
    expect(messages.map((text) => text.split('\n')[0])).toEqual([
      "💳 <b>Oylik to'lov yechildi</b>",
      '⏳ <b>3 kundan keyin akkaunt bloklanadi</b>',
      '⏳ <b>1 kundan keyin akkaunt bloklanadi</b>',
      '🔒 <b>Akkaunt bloklandi</b>',
    ]);
    expect(await told(ADMIN)).toEqual([`🔒 <b>X</b> bloklandi\nBalans: −200 so'm`]);

    // Paid up, the next charge three days away and not covered: one warning.
    await db.query(
      "insert into public.teacher_ledger (teacher_id, kind, amount) values ($1, 'payment', 200)",
      [TEACHER_X],
    );
    await db.exec('delete from private.sent_notifications');
    await remind('2026-02-02');
    expect((await told(TEACHER_X)).map((text) => text.split('\n')[0])).toEqual([
      "🔔 <b>3 kundan keyin oylik to'lov</b>",
    ]);
  });

  it('lets the admin record money, but never a charge, and never rewrite the ledger', async () => {
    const rls = /row-level security/;
    await expect(
      as(
        'authenticated',
        ADMIN,
        "insert into public.teacher_ledger (teacher_id, kind, amount) values ($1, 'charge', -1)",
        [TEACHER_C],
      ),
    ).rejects.toThrow(rls);
    await expect(as('authenticated', ADMIN, 'update public.teacher_ledger set amount = 1')).rejects.toThrow(
      /permission denied/,
    );
    await expect(as('authenticated', ADMIN, 'delete from public.teacher_ledger')).rejects.toThrow(
      /permission denied/,
    );

    await expect(
      as(
        'authenticated',
        TEACHER_C,
        "insert into public.teacher_ledger (teacher_id, kind, amount) values ($1, 'payment', 1)",
        [TEACHER_C],
      ),
    ).rejects.toThrow(rls);
    const ledger = await as<{ teacher_id: string }>(
      'authenticated',
      TEACHER_C,
      'select teacher_id from public.teacher_ledger',
    );
    expect(new Set(ledger.map((row) => row.teacher_id))).toEqual(new Set([TEACHER_C]));
    expect(await as('authenticated', TEACHER_C, 'select profile_id from public.teachers')).toEqual([
      { profile_id: TEACHER_C },
    ]);
  });

  it('shows the admin teachers and numbers, never a student', async () => {
    expect(await as('authenticated', ADMIN, 'select id from public.profiles')).toEqual([{ id: ADMIN }]);
    for (const table of [
      'practice_results',
      'student_payments',
      'star_awards',
      'written_homework',
      'rooms',
    ]) {
      expect(await as('authenticated', ADMIN, `select 1 from public.${table}`), table).toEqual([]);
    }
    const overview = await as<{
      id: string;
      student_count: number;
      tariff_id: string;
      practice_count: number;
    }>(
      'authenticated',
      ADMIN,
      'select id, student_count, tariff_id, practice_count from public.admin_teacher_overview($1, $2)',
      [addDays(today(), -30), today()],
    );
    expect(overview.find((row) => row.id === TEACHER_C)).toEqual({
      id: TEACHER_C,
      student_count: 2,
      tariff_id: tariffs.start,
      practice_count: 1,
    });
    await expect(
      as('authenticated', TEACHER_C, 'select * from public.admin_teacher_overview($1, $2)', [
        today(),
        today(),
      ]),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it('keeps the first billing day once a fee has been taken', async () => {
    const update = `select public.admin_update_teacher($1, 'Camila', '', '+998', '', $2, $3::date, false)`;
    await expect(
      as('authenticated', ADMIN, update, [TEACHER_C, tariffs.start, addDays(today(), -3)]),
    ).rejects.toThrow(/BILLING_STARTED/);
    await as('authenticated', ADMIN, update, [TEACHER_C, tariffs.old, addDays(today(), -10)]);
    expect(await as('authenticated', TEACHER_C, 'select tariff_id from public.teachers')).toEqual([
      { tariff_id: tariffs.old },
    ]);
    await expect(as('authenticated', TEACHER_C, update, [TEACHER_C, tariffs.start, null])).rejects.toThrow(
      /FORBIDDEN/,
    );
  });

  it('sells a gift only while it is in stock and the stars are there', async () => {
    const homework = async () => {
      const [room] = (await db.query<{ id: string }>(openRoom([BOBUR], 'finished', TEACHER_B))).rows;
      await db.query(
        `insert into public.practice_results (student_id, config, correct, total, mode, room_id)
         values ($1, $2, 5, 5, 'online', $3)`,
        [BOBUR, CONFIG, room.id],
      );
    };
    await homework();
    const last = await one(
      "insert into public.market_items (title, cost_stars, image_url, stock, teacher_id) values ('Oxirgi', 1, 'O', 1, $1) returning id",
      [TEACHER_B],
    );
    await as('authenticated', BOBUR, 'select public.place_order($1)', [last.id]);
    expect(
      await as('authenticated', BOBUR, 'select stock from public.market_items where id = $1', [last.id]),
    ).toEqual([{ stock: 0 }]);
    await homework();
    await expect(as('authenticated', BOBUR, 'select public.place_order($1)', [last.id])).rejects.toThrow(
      /OUT_OF_STOCK/,
    );

    const dear = await one(
      "insert into public.market_items (title, cost_stars, image_url, teacher_id) values ('Qimmat', 50, 'Q', $1) returning id",
      [TEACHER_B],
    );
    await expect(as('authenticated', BOBUR, 'select public.place_order($1)', [dear.id])).rejects.toThrow(
      /INSUFFICIENT_STARS/,
    );
  });

  it('offers guests only the public tariffs and the contact', async () => {
    const names = await as<{ name: string }>('anon', null, 'select name from public.tariffs');
    expect(names.map((row) => row.name)).toContain('Start');
    expect(names.map((row) => row.name)).not.toContain('Old');
    expect(names.map((row) => row.name)).not.toContain('Legacy');
    expect(await as('anon', null, 'select contact_phone from public.platform_settings')).toEqual([
      { contact_phone: '+998901234567' },
    ]);
    for (const sql of [
      'select 1 from public.teachers',
      'select 1 from public.teacher_ledger',
      'select public.my_features()',
      'select public.place_order(gen_random_uuid())',
    ]) {
      await expect(as('anon', null, sql), sql).rejects.toThrow(/permission denied/);
    }
  });

  it('widens only the role check, leaving the other profile checks alone', async () => {
    const { rows } = await db.query<{ conname: string }>(
      "select conname from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'c' order by conname",
    );
    expect(rows.map((row) => row.conname)).toEqual([
      'profiles_birth_year_check',
      'profiles_level_group_check',
      'profiles_role_check',
      'profiles_teacher_link',
      'profiles_username_check',
    ]);
  });

  it('never gives an admin a teacher', async () => {
    await db.query("insert into auth.users (id) values ('00000000-0000-4000-8000-0000000000e2')");
    await expect(
      insertProfile('00000000-0000-4000-8000-0000000000e2', 'admin', 'boss2', 'X', TEACHER_C),
    ).rejects.toThrow(/profiles_teacher_link|must name a teacher/);
  });
});
