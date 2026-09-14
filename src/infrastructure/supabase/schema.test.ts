/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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
const CONFIG = JSON.stringify({ section: 'formulasiz', rowCount: 4, secondsPerNumber: 6, problemCount: 5 });

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_PLATFORM);
  for (const file of readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
  }
  await db.exec(`
    insert into auth.users (id) values ('${TEACHER}'), ('${ALI}'), ('${VALI}');
    insert into public.profiles (id, role, username, first_name) values
      ('${TEACHER}', 'teacher', 'mohira', 'Mohira'),
      ('${ALI}', 'student', 'ali10', 'Ali'),
      ('${VALI}', 'student', 'vali20', 'Vali');
  `);
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

const openRoom = (participants: string[], status = 'waiting') =>
  `insert into public.rooms (status, participant_ids, configs)
   values ('${status}', '{${participants.join(',')}}', '{}') returning id`;

const saveProgress = `
  insert into public.room_progress (room_id, student_id, answered, correct, total, finished)
  values ($1, $2, $3, 0, 5, false)
  on conflict (room_id, student_id) do update set answered = excluded.answered`;

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
    const insert =
      'insert into public.practice_results (student_id, config, correct, total) values ($1, $2, 4, 5)';
    await as('authenticated', ALI, insert, [ALI, CONFIG]);
    await expect(as('authenticated', ALI, insert, [VALI, CONFIG])).rejects.toThrow(/row-level security/);
    expect(await as('authenticated', VALI, 'select student_id from public.practice_results')).toEqual([
      { student_id: ALI },
    ]);
  });

  it('lets only the teacher open rooms, one unfinished room at a time', async () => {
    await expect(as('authenticated', ALI, openRoom([ALI]))).rejects.toThrow(/row-level security/);

    const [room] = await as<{ id: string }>('authenticated', TEACHER, openRoom([ALI]));
    await expect(as('authenticated', TEACHER, openRoom([VALI]))).rejects.toThrow(/duplicate key/);
    await as('authenticated', TEACHER, "update public.rooms set status = 'finished' where id = $1", [
      room.id,
    ]);

    const [next] = await as<{ id: string }>('authenticated', TEACHER, openRoom([VALI]));
    expect(next.id).not.toBe(room.id);
    await as('authenticated', TEACHER, "update public.rooms set status = 'finished' where id = $1", [
      next.id,
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

  it("removes a student's data together with the account", async () => {
    await db.exec(`delete from auth.users where id = '${ALI}'`);
    const counts = await db.query<{ profiles: number; results: number; progress: number }>(`
      select
        (select count(*)::int from public.profiles where id = '${ALI}') as profiles,
        (select count(*)::int from public.practice_results where student_id = '${ALI}') as results,
        (select count(*)::int from public.room_progress where student_id = '${ALI}') as progress
    `);
    expect(counts.rows).toEqual([{ profiles: 0, results: 0, progress: 0 }]);
  });
});
