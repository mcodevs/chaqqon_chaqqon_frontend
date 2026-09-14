-- Follow-up to the Supabase advisors:
-- * RLS helpers live in a schema the Data API does not expose, so they cannot be called as RPCs.
-- * Overlapping permissive SELECT policies are merged into one policy per action.
-- * The room_id foreign key on practice_results gets a covering index.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create function private.is_teacher()
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

revoke execute on function private.is_teacher() from public;
grant execute on function private.is_teacher() to authenticated, service_role;

create or replace function public.student_accounts()
returns table (id uuid, username text, first_name text, last_name text, age smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.first_name, p.last_name, p.age
  from public.profiles p
  where p.role = 'student' and private.is_teacher()
  order by p.created_at, p.username;
$$;

-- rooms: one policy per action.
drop policy "Teacher manages rooms" on public.rooms;
drop policy "Participants read their rooms" on public.rooms;

create policy "Teacher and participants read rooms"
  on public.rooms for select to authenticated
  using ((select private.is_teacher()) or (select auth.uid()) = any (participant_ids));

create policy "Teacher opens rooms"
  on public.rooms for insert to authenticated
  with check ((select private.is_teacher()));

create policy "Teacher updates rooms"
  on public.rooms for update to authenticated
  using ((select private.is_teacher()))
  with check ((select private.is_teacher()));

-- room_progress: a single SELECT policy.
drop policy "Teacher reads progress" on public.room_progress;
drop policy "Participants read progress in their rooms" on public.room_progress;

create policy "Teacher and participants read progress"
  on public.room_progress for select to authenticated
  using (
    (select private.is_teacher())
    or exists (
      select 1 from public.rooms r
      where r.id = room_id and (select auth.uid()) = any (r.participant_ids)
    )
  );

drop function public.is_teacher();

create index practice_results_room_id_idx on public.practice_results (room_id);

comment on function public.teacher_exists() is
  'Callable by guests on purpose: the sign-in screen must know whether to offer teacher registration. Returns only a boolean.';
comment on function public.student_accounts() is
  'Callable by signed-in users on purpose: it returns rows only to the teacher, the one role allowed to see usernames.';
