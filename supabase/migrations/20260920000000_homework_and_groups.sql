-- Migration: 20260920000000_homework_and_groups.sql
-- Adds student level groups (A, B, C, D), birth year, avatar URL, last active timestamp,
-- and written homework tracking table.

-- 1. Profiles additions
alter table public.profiles
  add column if not exists last_active_at timestamptz default now(),
  add column if not exists birth_year smallint check (birth_year between 2000 and 2025),
  add column if not exists level_group text check (level_group in ('A', 'B', 'C', 'D')) default 'A',
  add column if not exists avatar_url text;

-- Allow authenticated users to read the new fields on profiles
grant select (last_active_at, birth_year, level_group, avatar_url) on public.profiles to authenticated;
grant update (last_active_at, avatar_url) on public.profiles to authenticated;

-- Policy for users to update their own profile (avatar and last_active_at)
create policy "Users update their own profile details"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Policy for teacher to update student level_group and birth_year
create policy "Teacher updates student profiles"
  on public.profiles for update to authenticated
  using ((select private.is_teacher()))
  with check ((select private.is_teacher()));

-- 2. Update student_accounts function to return all fields for the teacher
drop function if exists public.student_accounts();

create function public.student_accounts()
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  age smallint,
  birth_year smallint,
  level_group text,
  avatar_url text,
  last_active_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.first_name,
    p.last_name,
    p.age,
    p.birth_year,
    coalesce(p.level_group, 'A'),
    p.avatar_url,
    p.last_active_at
  from public.profiles p
  where p.role = 'student' and private.is_teacher()
  order by p.created_at, p.username;
$$;

revoke execute on function public.student_accounts() from public, anon;
grant execute on function public.student_accounts() to authenticated, service_role;

-- 3. Written Homework table (Yozma uy vazifasi)
create table if not exists public.written_homework (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  date date not null default (private.school_today()),
  status text not null check (status in ('bajardi', 'chala', 'bajarmadi')) default 'bajarmadi',
  notes text not null default '',
  updated_at timestamptz not null default now(),
  constraint written_homework_student_date_key unique (student_id, date)
);

create index if not exists written_homework_student_id_idx on public.written_homework (student_id);
create index if not exists written_homework_date_idx on public.written_homework (date desc);

-- Realtime for written homework
alter publication supabase_realtime add table public.written_homework;

-- Permissions
grant select on public.written_homework to authenticated;
grant insert, update, delete on public.written_homework to authenticated;

alter table public.written_homework enable row level security;

-- Teacher reads all written homework, student reads their own
create policy "Teacher reads all homework, students their own"
  on public.written_homework for select to authenticated
  using (
    (select private.is_teacher()) or student_id = (select auth.uid())
  );

-- Teacher creates and updates written homework
create policy "Teacher manages written homework"
  on public.written_homework for all to authenticated
  using ((select private.is_teacher()))
  with check ((select private.is_teacher()));

-- 4. Storage for Avatars (applied in Supabase where storage schema exists)
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('avatars', 'avatars', true)
    on conflict (id) do nothing;

    if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
      execute 'create policy "Public avatar access" on storage.objects for select to authenticated, anon using (bucket_id = ''avatars'')';
      execute 'create policy "Authenticated avatar uploads" on storage.objects for insert to authenticated with check (bucket_id = ''avatars'')';
      execute 'create policy "Authenticated avatar updates" on storage.objects for update to authenticated using (bucket_id = ''avatars'')';
    end if;
  end if;
end $$;
