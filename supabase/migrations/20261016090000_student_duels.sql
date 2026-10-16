-- Chaqqon-chaqqon: bellashuv — the competition the children run among themselves.
--
-- Until now every competition came from the teacher: they opened the homework room and they ran
-- the split screen. A duel is the other way round. A student opens it on their own phone, picks
-- classmates, chooses the settings, and from then on is its admin: the numbers flash on every
-- device at once and only the host moves everyone on to the next problem, watching the answers
-- land as they come.
--
-- Nobody supervises it, so it is worth no star and never reaches the class ranking: the app's
-- leaderboard drops `duel` results, and the star trigger only ever paid for `online` ones. What it
-- does leave is a record, which both the children and their teacher can look up.
--
-- Two rules shape the schema:
--   * only the host writes the duel row (the round it is on), and a player writes only their own
--     participant row, so two phones never overwrite each other;
--   * a duel nobody has moved on for 15 minutes is over — the host closed the tab or lost the
--     network. Whoever opens the page next closes it, and a nightly-style cron job sweeps up the
--     ones nobody comes back to. The rounds played so far are kept either way.
--
-- A duel's results are written by a trigger, not by the app: the insert policy on practice_results
-- still only lets a student record `practice` and `online` rows.
--
-- Safe to apply twice.

-- ---------------------------------------------------------------------------
-- 1. The tariff gains a section, and a result a mode
-- ---------------------------------------------------------------------------

alter table public.tariffs drop constraint if exists tariffs_features_check;
alter table public.tariffs add constraint tariffs_features_check check (
  features <@ array[
    'homework_rooms', 'classroom', 'market', 'leaderboard', 'stats',
    'worksheet', 'written_homework', 'extra_drills', 'telegram', 'duels'
  ]::text[]
);

-- The pre-platform teacher's free tariff is meant to hold every section, so it takes this one too.
update public.tariffs
set features = features || array['duels']
where name = 'Legacy' and not ('duels' = any (features));

alter table public.practice_results drop constraint if exists practice_results_mode_check;
alter table public.practice_results add constraint practice_results_mode_check
  check (mode in ('practice', 'online', 'classroom', 'duel'));

create or replace function public.my_features()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select private.is_admin()) then array[
      'homework_rooms', 'classroom', 'market', 'leaderboard', 'stats',
      'worksheet', 'written_homework', 'extra_drills', 'telegram', 'duels']
    else coalesce((
      select tr.features from public.teachers t
      join public.tariffs tr on tr.id = t.tariff_id
      where t.profile_id = private.my_teacher_id()
    ), '{}')
  end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Who may be invited
-- ---------------------------------------------------------------------------

-- Every id is a student of the caller's own teacher whose subscription is open. The host is one of
-- them, so this checks the host as well. It goes through a SECURITY DEFINER function on purpose: a
-- plain subquery on profiles would run under the caller's own row-level security and simply not
-- see another class's rows, so the check would pass by not looking.
create or replace function private.only_classmates_with_access(p_ids uuid[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select cardinality(p_ids) > 0 and not exists (
    select 1
    from unnest(p_ids) as wanted (id)
    left join public.profiles p on p.id = wanted.id
    where p.id is null
      or p.role <> 'student'
      or p.teacher_id is distinct from private.my_teacher_id()
      or not private.has_access(p.id)
  );
$$;

revoke execute on function private.only_classmates_with_access(uuid[]) from public;
grant execute on function private.only_classmates_with_access(uuid[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  -- The class it belongs to; the client never sends it.
  teacher_id uuid not null default private.my_teacher_id() references public.profiles (id) on delete cascade,
  host_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'running', 'finished')),
  -- Who may see it and join, the host included.
  invited_ids uuid[] not null check (cardinality(invited_ids) between 2 and 8),
  -- Settings per invited student, and the problems each of them gets.
  configs jsonb not null,
  problems jsonb not null,
  -- True when everyone plays the same settings, and therefore the same numbers.
  same_config boolean not null default true,
  round_count smallint not null check (round_count between 1 and 30),
  round smallint not null default 0 check (round >= 0),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  -- When the host last moved it on; it decides when an abandoned duel times out.
  updated_at timestamptz not null default now(),
  constraint duels_host_is_invited check (host_id = any (invited_ids)),
  constraint duels_round_within_count check (round < round_count)
);

create index if not exists duels_teacher_id_created_at_idx on public.duels (teacher_id, created_at desc);
create index if not exists duels_invited_ids_idx on public.duels using gin (invited_ids);

create table if not exists public.duel_participants (
  duel_id uuid not null references public.duels (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  -- Rounds reached, answered or missed because the host moved on.
  answered smallint not null default 0 check (answered >= 0),
  correct smallint not null default 0 check (correct >= 0),
  -- Time spent typing answers; it breaks a tie between equal scores.
  answer_ms integer not null default 0 check (answer_ms >= 0),
  primary key (duel_id, student_id),
  constraint duel_participants_counts check (correct <= answered)
);

create index if not exists duel_participants_student_id_idx on public.duel_participants (student_id);

-- ---------------------------------------------------------------------------
-- 4. Privileges: only the columns the app writes
-- ---------------------------------------------------------------------------

revoke all on public.duels, public.duel_participants from anon, authenticated;

grant select on public.duels to authenticated;
grant insert (id, host_id, invited_ids, configs, problems, same_config, round_count)
  on public.duels to authenticated;
grant update (status, round, started_at, finished_at) on public.duels to authenticated;

grant select on public.duel_participants to authenticated;
grant insert (duel_id, student_id, joined_at) on public.duel_participants to authenticated;
grant update (answered, correct, answer_ms) on public.duel_participants to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Row-level security
-- ---------------------------------------------------------------------------

alter table public.duels enable row level security;
alter table public.duel_participants enable row level security;

drop policy if exists "Invited players and their teacher read duels" on public.duels;
create policy "Invited players and their teacher read duels"
  on public.duels for select to authenticated
  using (teacher_id = (select auth.uid()) or (select auth.uid()) = any (invited_ids));

drop policy if exists "A paid student opens a duel with their own classmates" on public.duels;
create policy "A paid student opens a duel with their own classmates"
  on public.duels for insert to authenticated
  with check (
    host_id = (select auth.uid())
    and teacher_id = (select private.my_teacher_id())
    and (select private.my_teacher_has_feature('duels'))
    and private.only_classmates_with_access(invited_ids)
  );

drop policy if exists "The host drives their own duel" on public.duels;
create policy "The host drives their own duel"
  on public.duels for update to authenticated
  using (host_id = (select auth.uid()) and status <> 'finished')
  with check (host_id = (select auth.uid()));

-- Nobody is left staring at an abandoned duel: once it has timed out, anyone it invited may close
-- it, which is the only change this policy allows.
drop policy if exists "An invited player closes a timed-out duel" on public.duels;
create policy "An invited player closes a timed-out duel"
  on public.duels for update to authenticated
  using (
    (select auth.uid()) = any (invited_ids)
    and status <> 'finished'
    and updated_at < now() - interval '15 minutes'
  )
  with check (status = 'finished');

drop policy if exists "Players and the teacher read a duel's participants" on public.duel_participants;
create policy "Players and the teacher read a duel's participants"
  on public.duel_participants for select to authenticated
  using (
    exists (
      select 1 from public.duels d
      where d.id = duel_id
        and (d.teacher_id = (select auth.uid()) or (select auth.uid()) = any (d.invited_ids))
    )
  );

drop policy if exists "An invited player joins a lobby" on public.duel_participants;
create policy "An invited player joins a lobby"
  on public.duel_participants for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and (select private.has_access((select auth.uid())))
    and exists (
      select 1 from public.duels d
      where d.id = duel_id and d.status = 'lobby' and student_id = any (d.invited_ids)
    )
  );

drop policy if exists "A player records their own answers" on public.duel_participants;
create policy "A player records their own answers"
  on public.duel_participants for update to authenticated
  using (student_id = (select auth.uid()))
  with check (
    student_id = (select auth.uid())
    and exists (select 1 from public.duels d where d.id = duel_id and d.status = 'running')
  );

-- ---------------------------------------------------------------------------
-- 6. What the database does by itself
-- ---------------------------------------------------------------------------

create or replace function private.stamp_duel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists duels_stamp on public.duels;
create trigger duels_stamp
  before update on public.duels
  for each row execute function private.stamp_duel();

-- The host plays too, so their row is there from the start and no second request can fail.
create or replace function private.add_duel_host()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.duel_participants (duel_id, student_id, joined_at)
  values (new.id, new.host_id, new.created_at)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists duels_add_host on public.duels;
create trigger duels_add_host
  after insert on public.duels
  for each row execute function private.add_duel_host();

-- A finished duel writes a result for everyone who answered at least one round: the rounds they
-- reached, and how many of them they got right. Mode 'duel' pays no star and the app's leaderboard
-- leaves it out, so this records the game without touching anybody's standing.
create or replace function private.on_duel_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.practice_results (student_id, config, correct, total, mode)
  select
    p.student_id,
    coalesce(new.configs -> p.student_id::text, '{}'::jsonb),
    p.correct,
    p.answered,
    'duel'
  from public.duel_participants p
  where p.duel_id = new.id and p.answered > 0;
  return new;
end;
$$;

drop trigger if exists duels_record_results on public.duels;
create trigger duels_record_results
  after update of status on public.duels
  for each row
  when (new.status = 'finished' and old.status <> 'finished')
  execute function private.on_duel_finished();

-- The sweep for duels nobody comes back to. It keeps the same 15 minutes as DUEL_IDLE_MS in the
-- app and as the policy above, so a client and the job agree on when a duel is over.
create or replace function private.expire_stale_duels()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.duels
  set status = 'finished', finished_at = now()
  where status <> 'finished' and updated_at < now() - interval '15 minutes';
$$;

revoke execute on function private.expire_stale_duels() from public, anon;
grant execute on function private.expire_stale_duels() to service_role;

-- Every ten minutes. Guarded: the embedded Postgres in the tests has no pg_cron.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('duels-expire', '*/10 * * * *', 'select private.expire_stale_duels()');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Realtime: the lobby fills up and the answers land live
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.duels, public.duel_participants;
exception
  when duplicate_object then null;
end $$;
