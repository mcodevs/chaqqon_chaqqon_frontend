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
`;

const TEACHER = '00000000-0000-4000-8000-00000000000a';
const ALI = '00000000-0000-4000-8000-0000000000b1';
const VALI = '00000000-0000-4000-8000-0000000000b2';
/** Joins after billing started, so she has no payment. */
const GULI = '00000000-0000-4000-8000-0000000000b3';
const CONFIG = JSON.stringify({ section: 'formulasiz', rowCount: 4, secondsPerNumber: 6, problemCount: 5 });

let db: PGlite;

async function addUser(id: string, role: 'teacher' | 'student', username: string, firstName: string) {
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query('insert into public.profiles (id, role, username, first_name) values ($1, $2, $3, $4)', [
    id,
    role,
    username,
    firstName,
  ]);
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
    await db.exec('reset role;');
  }
}

const today = () => schoolDate(new Date());

const openRoom = (participants: string[], status = 'waiting') =>
  `insert into public.rooms (status, participant_ids, configs)
   values ('${status}', '{${participants.join(',')}}', '{}') returning id`;

const saveProgress = `
  insert into public.room_progress (room_id, student_id, answered, correct, total, finished)
  values ($1, $2, $3, 0, 5, false)
  on conflict (room_id, student_id) do update set answered = excluded.answered`;

const recordResult =
  'insert into public.practice_results (student_id, config, correct, total) values ($1, $2, 4, 5)';

const recordPayment =
  'insert into public.student_payments (student_id, paid_until) values ($1, $2) returning paid_until::text, kind';

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
    await addUser(GULI, 'student', 'guli30', 'Guli');

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
    expect(await as('authenticated', GULI, 'select count(*)::int as count from public.profiles')).toEqual([
      { count: 4 },
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

  it('allows an authenticated user to link and unlink their telegram account', async () => {
    // Guest cannot call link_telegram_account
    await expect(
      as('anon', '', 'select public.link_telegram_account(123456789::bigint, 123456789::bigint, $1, $2)', [
        'alibek',
        'Ali',
      ]),
    ).rejects.toThrow();

    // Authenticated user can link
    const res = await as(
      'authenticated',
      VALI,
      'select public.link_telegram_account(99887766::bigint, 99887766::bigint, $1, $2) as linked',
      ['valibek', 'Vali'],
    );
    expect(res).toEqual([{ linked: true }]);

    // Profile contains the linked telegram data
    const profile = await as<{ telegram_user_id: number; telegram_username: string }>(
      'authenticated',
      VALI,
      'select telegram_user_id, telegram_username from public.profiles where id = $1',
      [VALI],
    );
    expect(profile).toEqual([{ telegram_user_id: 99887766, telegram_username: 'valibek' }]);

    // Another user cannot link the same telegram user ID
    await expect(
      as(
        'authenticated',
        GULI,
        'select public.link_telegram_account(99887766::bigint, 99887766::bigint, $1, $2)',
        ['gulibek', 'Guli'],
      ),
    ).rejects.toThrow(/TELEGRAM_ACCOUNT_ALREADY_LINKED/);

    // Unlink works
    const unlinked = await as('authenticated', VALI, 'select public.unlink_telegram_account() as unlinked');
    expect(unlinked).toEqual([{ unlinked: true }]);

    const cleared = await as<{ telegram_user_id: string | null }>(
      'authenticated',
      VALI,
      'select telegram_user_id from public.profiles where id = $1',
      [VALI],
    );
    expect(cleared).toEqual([{ telegram_user_id: null }]);
  });
});
