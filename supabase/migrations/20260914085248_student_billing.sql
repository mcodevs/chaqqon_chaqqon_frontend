-- Paid access. The teacher records a payment with the day a student's access ends ("To'ladi"), and
-- the latest payment decides, so a wrong day is fixed by recording the right one. Days are counted in
-- Tashkent (UTC+5, no daylight saving time). The rules mirror src/domain/billing.ts; schema.test.ts
-- checks that both agree.

create table public.student_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  -- The first day without access.
  paid_until date not null,
  kind text not null default 'payment' check (kind in ('payment', 'launch'))
);

create index student_payments_latest_idx on public.student_payments (student_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- Rules
-- ---------------------------------------------------------------------------

create function private.school_today()
returns date
language sql
stable
set search_path = ''
as $$
  select ((now() at time zone 'UTC') + interval '5 hours')::date;
$$;

-- The latest payment decides.
create function private.has_access(student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.paid_until > private.school_today()
    from public.student_payments p
    where p.student_id = student
    order by p.recorded_at desc
    limit 1
  ), false);
$$;

-- The teacher, or a student whose payment covers today.
create function private.can_use_app()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_teacher() or private.has_access((select auth.uid()));
$$;

revoke execute on function private.school_today(), private.has_access(uuid), private.can_use_app() from public;
grant execute on function private.school_today(), private.has_access(uuid), private.can_use_app()
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Payments: privileges and row-level security
-- ---------------------------------------------------------------------------

revoke all on public.student_payments from anon, authenticated;
grant select, delete on public.student_payments to authenticated;
-- id, recorded_at and kind always come from the database.
grant insert (student_id, paid_until) on public.student_payments to authenticated;

alter table public.student_payments enable row level security;

create policy "Teacher reads all payments, students their own"
  on public.student_payments for select to authenticated
  using ((select private.is_teacher()) or student_id = (select auth.uid()));

-- From tomorrow up to 24 months ahead on the database clock, as isValidPaidUntil in the app.
create policy "Teacher records payments for students"
  on public.student_payments for insert to authenticated
  with check (
    (select private.is_teacher())
    and exists (select 1 from public.profiles p where p.id = student_id and p.role = 'student')
    and paid_until > (select private.school_today())
    and paid_until <= ((select private.school_today()) + interval '24 months')::date
  );

create policy "Teacher takes payments back"
  on public.student_payments for delete to authenticated
  using ((select private.is_teacher()));

-- ---------------------------------------------------------------------------
-- Payments limit students only: a closed student reads nothing but their own profile and
-- payments, and writes nothing. The teacher is never limited. The app keeps closed students
-- out of competitions, and a room must stay saveable when a participant's access ends
-- halfway (rooms are saved with an upsert, which Postgres checks against INSERT policies too).
-- ---------------------------------------------------------------------------

drop policy "Signed-in users read profiles" on public.profiles;
create policy "Users read their own profile; open users read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.can_use_app()));

drop policy "Signed-in users read results" on public.practice_results;
create policy "Teacher and paid students read results"
  on public.practice_results for select to authenticated
  using ((select private.can_use_app()));

drop policy "Students record their results; the teacher records classroom matches" on public.practice_results;
create policy "Paid students record results, the teacher classroom matches"
  on public.practice_results for insert to authenticated
  with check (
    (
      student_id = (select auth.uid())
      and (select private.has_access((select auth.uid())))
      and mode in ('practice', 'online')
      and (
        room_id is null
        or exists (
          select 1 from public.rooms r
          where r.id = room_id and student_id = any (r.participant_ids)
        )
      )
    )
    or (
      mode = 'classroom'
      and (select private.is_teacher())
      and exists (select 1 from public.profiles p where p.id = student_id and p.role = 'student')
    )
  );

drop policy "Teacher and participants read rooms" on public.rooms;
create policy "Teacher and paid participants read rooms"
  on public.rooms for select to authenticated
  using (
    (select private.is_teacher())
    or ((select auth.uid()) = any (participant_ids) and (select private.has_access((select auth.uid()))))
  );

drop policy "Teacher and participants read progress" on public.room_progress;
create policy "Teacher and paid participants read progress"
  on public.room_progress for select to authenticated
  using (
    (select private.is_teacher())
    or (
      (select private.has_access((select auth.uid())))
      and exists (
        select 1 from public.rooms r
        where r.id = room_id and (select auth.uid()) = any (r.participant_ids)
      )
    )
  );

drop policy "Participants record their progress while the room runs" on public.room_progress;
create policy "Paid participants record progress while the room runs"
  on public.room_progress for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and (select private.has_access((select auth.uid())))
    and exists (
      select 1 from public.rooms r
      where r.id = room_id and r.status = 'running' and student_id = any (r.participant_ids)
    )
  );

drop policy "Participants update their progress while the room runs" on public.room_progress;
create policy "Paid participants update progress while the room runs"
  on public.room_progress for update to authenticated
  using (student_id = (select auth.uid()))
  with check (
    student_id = (select auth.uid())
    and (select private.has_access((select auth.uid())))
    and exists (
      select 1 from public.rooms r
      where r.id = room_id and r.status = 'running' and student_id = any (r.participant_ids)
    )
  );

-- ---------------------------------------------------------------------------
-- Launch: students who already exist keep access until the end of this month
-- ---------------------------------------------------------------------------

insert into public.student_payments (student_id, paid_until, kind)
select id, (date_trunc('month', private.school_today()::timestamp) + interval '1 month')::date, 'launch'
from public.profiles
where role = 'student';

-- A closed student's page opens as soon as the teacher records the payment.
alter publication supabase_realtime add table public.student_payments;
