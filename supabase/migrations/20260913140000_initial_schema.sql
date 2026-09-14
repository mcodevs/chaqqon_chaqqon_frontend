-- Chaqqon-chaqqon: initial schema.
-- Accounts live in auth.users. Profiles are written only by Edge Functions (service role);
-- the web client reads through row-level security.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  username text not null unique check (username ~ '^[a-z0-9._-]{3,30}$'),
  first_name text not null default '',
  last_name text not null default '',
  age smallint check (age between 3 and 99),
  created_at timestamptz not null default now()
);

-- The app has exactly one teacher.
create unique index profiles_single_teacher on public.profiles (role) where role = 'teacher';

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null check (status in ('waiting', 'running', 'finished')),
  participant_ids uuid[] not null check (cardinality(participant_ids) between 1 and 5),
  configs jsonb not null
);

-- At most one room that has not finished.
create unique index rooms_single_active on public.rooms ((true)) where status <> 'finished';

create table public.room_progress (
  room_id uuid not null references public.rooms (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  answered smallint not null check (answered >= 0),
  correct smallint not null,
  total smallint not null check (total >= 0),
  finished boolean not null default false,
  primary key (room_id, student_id),
  constraint room_progress_counts check (correct between 0 and answered)
);

create index room_progress_student_id_idx on public.room_progress (student_id);

create table public.practice_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  config jsonb not null,
  correct smallint not null,
  total smallint not null,
  room_id uuid references public.rooms (id) on delete set null,
  constraint practice_results_counts check (total > 0 and correct between 0 and total)
);

create index practice_results_student_id_idx on public.practice_results (student_id);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

create function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'teacher'
  );
$$;

-- Lets the sign-in screen decide between "create the teacher account" and "log in".
create function public.teacher_exists()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where role = 'teacher');
$$;

-- Usernames are readable only through this function, and only by the teacher.
create function public.student_accounts()
returns table (id uuid, username text, first_name text, last_name text, age smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.first_name, p.last_name, p.age
  from public.profiles p
  where p.role = 'student' and public.is_teacher()
  order by p.created_at, p.username;
$$;

revoke execute on function public.is_teacher() from public, anon;
revoke execute on function public.teacher_exists() from public;
revoke execute on function public.student_accounts() from public, anon;
grant execute on function public.is_teacher() to authenticated, service_role;
grant execute on function public.teacher_exists() to anon, authenticated, service_role;
grant execute on function public.student_accounts() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privileges: nothing for guests, only what the app needs for signed-in users
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.rooms, public.room_progress, public.practice_results
  from anon, authenticated;

grant select (id, role, first_name, last_name, age, created_at) on public.profiles to authenticated;
grant select, insert, update on public.rooms to authenticated;
grant select, insert, update on public.room_progress to authenticated;
grant select, insert on public.practice_results to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_progress enable row level security;
alter table public.practice_results enable row level security;

create policy "Signed-in users read profiles"
  on public.profiles for select to authenticated
  using (true);

create policy "Teacher manages rooms"
  on public.rooms for all to authenticated
  using ((select public.is_teacher()))
  with check ((select public.is_teacher()));

create policy "Participants read their rooms"
  on public.rooms for select to authenticated
  using ((select auth.uid()) = any (participant_ids));

create policy "Teacher reads progress"
  on public.room_progress for select to authenticated
  using ((select public.is_teacher()));

create policy "Participants read progress in their rooms"
  on public.room_progress for select to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and (select auth.uid()) = any (r.participant_ids)
    )
  );

create policy "Participants record their progress while the room runs"
  on public.room_progress for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.rooms r
      where r.id = room_id and r.status = 'running' and student_id = any (r.participant_ids)
    )
  );

create policy "Participants update their progress while the room runs"
  on public.room_progress for update to authenticated
  using (student_id = (select auth.uid()))
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.rooms r
      where r.id = room_id and r.status = 'running' and student_id = any (r.participant_ids)
    )
  );

create policy "Signed-in users read results"
  on public.practice_results for select to authenticated
  using (true);

create policy "Students record their own results"
  on public.practice_results for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and (
      room_id is null
      or exists (
        select 1 from public.rooms r
        where r.id = room_id and student_id = any (r.participant_ids)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime: live competition monitor and leaderboard.
-- Profiles stay out, because change payloads would carry usernames.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.rooms, public.room_progress, public.practice_results;
