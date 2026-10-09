-- Chaqqon-chaqqon becomes a platform for many teachers, and every teacher is a tenant.
--
-- Until now the app had exactly one teacher, so "is the caller a teacher?" was enough and every
-- teacher policy covered every row. From here each student belongs to one teacher, and a teacher
-- sees and changes only their own students, rooms, results, payments, homework, shop and stars.
-- A paid student still sees their classmates (the leaderboard), but only the ones of their teacher.
--
-- Ownership lives on the root rows only: profiles.teacher_id for students, and teacher_id on rooms
-- and market items. Everything else hangs off a student and follows that student's teacher.
--
-- Cross-row checks go through the SECURITY DEFINER helpers below and never through a plain
-- subquery on profiles: such a subquery runs under the caller's own row-level security and simply
-- cannot see another tenant's rows, so a "no foreign participant" test would pass by not looking.
--
-- Safe to apply twice: the deploy applies it through the Supabase connector first and the Git
-- integration may run it again.

-- ---------------------------------------------------------------------------
-- 1. Ownership columns
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists teacher_id uuid references public.profiles (id) on delete restrict;

alter table public.rooms
  add column if not exists teacher_id uuid references public.profiles (id) on delete cascade;

alter table public.market_items
  add column if not exists teacher_id uuid references public.profiles (id) on delete cascade;

-- Everything that exists so far belongs to the one teacher the app has had. The check only runs
-- while there is something left to hand over, so a later run with several teachers passes.
do $$
declare
  v_teacher uuid;
begin
  if exists (select 1 from public.profiles where role = 'student' and teacher_id is null)
     or exists (select 1 from public.rooms where teacher_id is null)
     or exists (select 1 from public.market_items where teacher_id is null) then
    select (array_agg(id))[1] into v_teacher
    from public.profiles
    where role = 'teacher'
    having count(*) = 1;

    if v_teacher is null then
      raise exception 'teacher_tenancy: expected exactly one teacher to own the existing data';
    end if;

    update public.profiles set teacher_id = v_teacher where role = 'student' and teacher_id is null;
    update public.rooms set teacher_id = v_teacher where teacher_id is null;
    update public.market_items set teacher_id = v_teacher where teacher_id is null;
  end if;
end $$;

-- A student always has a teacher; a teacher has none.
do $$
begin
  alter table public.profiles
    add constraint profiles_teacher_link check ((role = 'student') = (teacher_id is not null));
exception
  when duplicate_object then null;
end $$;

-- The client never sends the owner: a new room or item belongs to whoever creates it.
alter table public.rooms alter column teacher_id set default auth.uid();
alter table public.rooms alter column teacher_id set not null;
alter table public.market_items alter column teacher_id set default auth.uid();
alter table public.market_items alter column teacher_id set not null;

create index if not exists profiles_teacher_id_idx on public.profiles (teacher_id);
create index if not exists rooms_teacher_id_created_at_idx on public.rooms (teacher_id, created_at desc);
create index if not exists market_items_teacher_id_idx on public.market_items (teacher_id);
create index if not exists market_orders_item_id_idx on public.market_orders (item_id);

-- Many teachers from now on.
drop index if exists public.profiles_single_teacher;

-- Readable like the other profile columns, never writable from the app.
grant select (teacher_id) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Tenant helpers
-- ---------------------------------------------------------------------------

-- The teacher whose class the caller belongs to: their own id for a teacher, their teacher's for a
-- student.
create or replace function private.my_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case p.role when 'teacher' then p.id when 'student' then p.teacher_id end
  from public.profiles p
  where p.id = (select auth.uid());
$$;

-- The caller's own students; empty for anyone who is not a teacher.
create or replace function private.my_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.profiles s
  where s.teacher_id = (select auth.uid()) and s.role = 'student';
$$;

create or replace function private.is_my_student(p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles s
    where s.id = p_student and s.role = 'student' and s.teacher_id = (select auth.uid())
  );
$$;

-- The students the caller may see: a teacher's whole class, or a paid student's classmates.
-- Empty for a student whose access has ended.
create or replace function private.visible_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.profiles me
  join public.profiles s
    on s.role = 'student'
   and s.teacher_id = case
     when me.role = 'teacher' then me.id
     when me.role = 'student' and private.has_access(me.id) then me.teacher_id
   end
  where me.id = (select auth.uid());
$$;

-- No participant belongs to anyone else. A deleted student no longer exists, so a room that still
-- lists one can be finished.
create or replace function private.only_my_students(p_ids uuid[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles p
    where p.id = any (p_ids)
      and (p.role <> 'student' or p.teacher_id is distinct from (select auth.uid()))
  );
$$;

-- A student's teacher must be a teacher.
create or replace function private.check_student_teacher()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'student' and not exists (
    select 1 from public.profiles t where t.id = new.teacher_id and t.role = 'teacher'
  ) then
    raise exception 'A student''s teacher_id must name a teacher';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_check_student_teacher on public.profiles;
create trigger profiles_check_student_teacher
  before insert or update of teacher_id on public.profiles
  for each row execute function private.check_student_teacher();

revoke execute on function
  private.my_teacher_id(),
  private.my_student_ids(),
  private.is_my_student(uuid),
  private.visible_student_ids(),
  private.only_my_students(uuid[])
from public;
grant execute on function
  private.my_teacher_id(),
  private.my_student_ids(),
  private.is_my_student(uuid),
  private.visible_student_ids(),
  private.only_my_students(uuid[])
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Profiles
-- ---------------------------------------------------------------------------

drop policy if exists "Users read their own profile; open users read all" on public.profiles;
drop policy if exists "Users read their own profile and their class" on public.profiles;
create policy "Users read their own profile and their class"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or id in (select private.visible_student_ids()));

drop policy if exists "Teacher updates student profiles" on public.profiles;
drop policy if exists "Teacher updates their own students' profiles" on public.profiles;
create policy "Teacher updates their own students' profiles"
  on public.profiles for update to authenticated
  using (role = 'student' and teacher_id = (select auth.uid()))
  with check (role = 'student' and teacher_id = (select auth.uid()));

create or replace function public.student_accounts()
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
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
    p.birth_year,
    coalesce(p.level_group, 'A'),
    p.avatar_url,
    p.last_active_at
  from public.profiles p
  where p.role = 'student' and p.teacher_id = (select auth.uid())
  order by p.created_at;
$$;

comment on function public.student_accounts() is
  'Callable by signed-in users on purpose: it returns rows only to a teacher, and only their own students.';

create or replace function public.update_student_profile(
  student_id uuid,
  first_name text default null,
  last_name text default null,
  birth_year smallint default null,
  level_group text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_my_student(update_student_profile.student_id) then
    raise exception 'Unauthorized';
  end if;

  update public.profiles
  set
    first_name = coalesce(update_student_profile.first_name, profiles.first_name),
    last_name = coalesce(update_student_profile.last_name, profiles.last_name),
    birth_year = coalesce(update_student_profile.birth_year, profiles.birth_year),
    level_group = coalesce(update_student_profile.level_group, profiles.level_group)
  where profiles.id = update_student_profile.student_id and profiles.role = 'student';
end;
$$;

revoke execute on function public.update_student_profile(uuid, text, text, smallint, text) from public, anon;
grant execute on function public.update_student_profile(uuid, text, text, smallint, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Rooms and progress
-- ---------------------------------------------------------------------------

drop policy if exists "Teacher and paid participants read rooms" on public.rooms;
drop policy if exists "Owner and paid participants read rooms" on public.rooms;
create policy "Owner and paid participants read rooms"
  on public.rooms for select to authenticated
  using (
    teacher_id = (select auth.uid())
    or ((select auth.uid()) = any (participant_ids) and (select private.has_access((select auth.uid()))))
  );

drop policy if exists "Teacher opens rooms" on public.rooms;
drop policy if exists "Teacher opens rooms for their own students" on public.rooms;
create policy "Teacher opens rooms for their own students"
  on public.rooms for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and (select private.is_teacher())
    and private.only_my_students(participant_ids)
  );

drop policy if exists "Teacher updates rooms" on public.rooms;
drop policy if exists "Teacher updates their own rooms" on public.rooms;
create policy "Teacher updates their own rooms"
  on public.rooms for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()) and private.only_my_students(participant_ids));

drop policy if exists "Teacher and paid participants read progress" on public.room_progress;
drop policy if exists "Owner and paid participants read progress" on public.room_progress;
create policy "Owner and paid participants read progress"
  on public.room_progress for select to authenticated
  using (
    exists (select 1 from public.rooms r where r.id = room_id and r.teacher_id = (select auth.uid()))
    or (
      (select private.has_access((select auth.uid())))
      and exists (
        select 1 from public.rooms r
        where r.id = room_id and (select auth.uid()) = any (r.participant_ids)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Results
-- ---------------------------------------------------------------------------

drop policy if exists "Teacher and paid students read results" on public.practice_results;
drop policy if exists "Teacher and paid students read their class's results" on public.practice_results;
create policy "Teacher and paid students read their class's results"
  on public.practice_results for select to authenticated
  using (student_id in (select private.visible_student_ids()));

drop policy if exists "Paid students record results, the teacher classroom matches" on public.practice_results;
drop policy if exists "Paid students record results, the teacher their own classroom matches" on public.practice_results;
create policy "Paid students record results, the teacher their own classroom matches"
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
      and private.is_my_student(student_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Student payments
-- ---------------------------------------------------------------------------

drop policy if exists "Teacher reads all payments, students their own" on public.student_payments;
drop policy if exists "Teacher reads their students' payments, students their own" on public.student_payments;
create policy "Teacher reads their students' payments, students their own"
  on public.student_payments for select to authenticated
  using (student_id = (select auth.uid()) or student_id in (select private.my_student_ids()));

-- From tomorrow up to 24 months ahead on the database clock, as isValidPaidUntil in the app.
drop policy if exists "Teacher records payments for students" on public.student_payments;
drop policy if exists "Teacher records payments for their own students" on public.student_payments;
create policy "Teacher records payments for their own students"
  on public.student_payments for insert to authenticated
  with check (
    student_id in (select private.my_student_ids())
    and paid_until > (select private.school_today())
    and paid_until <= ((select private.school_today()) + interval '24 months')::date
  );

drop policy if exists "Teacher takes payments back" on public.student_payments;
drop policy if exists "Teacher takes back their own students' payments" on public.student_payments;
create policy "Teacher takes back their own students' payments"
  on public.student_payments for delete to authenticated
  using (student_id in (select private.my_student_ids()));

-- ---------------------------------------------------------------------------
-- 7. Written homework
-- ---------------------------------------------------------------------------

-- The table was left with Supabase's default privileges; only what the app uses remains.
revoke all on public.written_homework from anon, authenticated;
grant select, insert, update, delete on public.written_homework to authenticated;

drop policy if exists "Teacher reads all homework, students their own" on public.written_homework;
drop policy if exists "Teacher manages written homework" on public.written_homework;
drop policy if exists "Students read their own homework, the teacher their students'" on public.written_homework;
drop policy if exists "Teacher records homework for their own students" on public.written_homework;
drop policy if exists "Teacher updates their own students' homework" on public.written_homework;
drop policy if exists "Teacher deletes their own students' homework" on public.written_homework;

create policy "Students read their own homework, the teacher their students'"
  on public.written_homework for select to authenticated
  using (student_id = (select auth.uid()) or student_id in (select private.my_student_ids()));

create policy "Teacher records homework for their own students"
  on public.written_homework for insert to authenticated
  with check (student_id in (select private.my_student_ids()));

create policy "Teacher updates their own students' homework"
  on public.written_homework for update to authenticated
  using (student_id in (select private.my_student_ids()))
  with check (student_id in (select private.my_student_ids()));

create policy "Teacher deletes their own students' homework"
  on public.written_homework for delete to authenticated
  using (student_id in (select private.my_student_ids()));

-- ---------------------------------------------------------------------------
-- 8. Shop, orders and stars
-- ---------------------------------------------------------------------------

revoke all on public.market_items, public.market_orders, public.star_awards from anon, authenticated;
grant select, insert, update, delete on public.market_items to authenticated;
grant select, insert on public.market_orders to authenticated;
grant update (status) on public.market_orders to authenticated;
grant select on public.star_awards to authenticated;

drop policy if exists "Authenticated users read market items" on public.market_items;
drop policy if exists "Teacher manages market items" on public.market_items;
drop policy if exists "Users read their teacher's market items" on public.market_items;
drop policy if exists "Teacher adds market items" on public.market_items;
drop policy if exists "Teacher updates their own market items" on public.market_items;
drop policy if exists "Teacher deletes their own market items" on public.market_items;

create policy "Users read their teacher's market items"
  on public.market_items for select to authenticated
  using (teacher_id = (select private.my_teacher_id()));

create policy "Teacher adds market items"
  on public.market_items for insert to authenticated
  with check (teacher_id = (select auth.uid()) and (select private.is_teacher()));

create policy "Teacher updates their own market items"
  on public.market_items for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

create policy "Teacher deletes their own market items"
  on public.market_items for delete to authenticated
  using (teacher_id = (select auth.uid()));

drop policy if exists "Users read orders" on public.market_orders;
drop policy if exists "Students read their orders, the teacher their students'" on public.market_orders;
create policy "Students read their orders, the teacher their students'"
  on public.market_orders for select to authenticated
  using (student_id = (select auth.uid()) or student_id in (select private.my_student_ids()));

-- A paid student buys from their own teacher's shop, at the price on the shelf.
drop policy if exists "Students place orders" on public.market_orders;
drop policy if exists "Paid students order from their teacher's shop" on public.market_orders;
create policy "Paid students order from their teacher's shop"
  on public.market_orders for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and (select private.has_access((select auth.uid())))
    and exists (
      select 1 from public.market_items i
      where i.id = item_id
        and i.teacher_id = (select private.my_teacher_id())
        and i.cost_stars = market_orders.cost_stars
    )
  );

drop policy if exists "Teacher updates orders" on public.market_orders;
drop policy if exists "Teacher updates their own students' orders" on public.market_orders;
create policy "Teacher updates their own students' orders"
  on public.market_orders for update to authenticated
  using (student_id in (select private.my_student_ids()))
  with check (student_id in (select private.my_student_ids()));

drop policy if exists "Users read their own stars" on public.star_awards;
drop policy if exists "Students read their own stars, the teacher their students'" on public.star_awards;
create policy "Students read their own stars, the teacher their students'"
  on public.star_awards for select to authenticated
  using (student_id = (select auth.uid()) or student_id in (select private.my_student_ids()));

-- Every policy that used it is gone.
drop function if exists private.can_use_app();

-- ---------------------------------------------------------------------------
-- 9. Telegram: the teacher to tell is the student's or the room's own
-- ---------------------------------------------------------------------------

create or replace function private.on_market_order_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_teacher uuid;
begin
  perform private.notify_telegram(
    new.student_id,
    '🎁 <b>Xarid qilindi</b>' || E'\n' ||
    private.html_escape(new.item_title) || ' — ' || new.cost_stars || ' ⭐' || E'\n' ||
    'Ustoz tez orada topshiradi.'
  );

  select teacher_id into v_teacher from public.profiles where id = new.student_id;
  if v_teacher is not null then
    perform private.notify_telegram(
      v_teacher,
      '🛒 <b>Yangi buyurtma</b>' || E'\n' ||
      '<b>' || private.html_escape(private.display_name(new.student_id)) || '</b>: ' ||
      private.html_escape(new.item_title) || ' — ' || new.cost_stars || ' ⭐'
    );
  end if;
  return new;
end;
$fn$;

create or replace function private.on_room_progress_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_teacher uuid;
begin
  select teacher_id into v_teacher from public.rooms where id = new.room_id;
  if v_teacher is not null then
    perform private.notify_telegram(
      v_teacher,
      '🎯 <b>' || private.html_escape(private.display_name(new.student_id)) || '</b> interaktiv uy vazifasini tugatdi' || E'\n' ||
      'Natija: ' || new.correct || '/' || new.total || ' toʻgʻri'
    );
  end if;
  return new;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 10. Storage: everyone writes only under their own id
-- ---------------------------------------------------------------------------
-- Files are named "<uid>/<time>.<ext>"; the old flat "<uid>-<time>.<ext>" names start with the id
-- too, so both match left(name, 36). Public buckets serve their URLs without row-level security,
-- so nobody needs to list other people's files.
--
-- Transitional until the platform migration: a teacher may still write any avatar (the previous
-- app named a new student's picture after a temporary id) and the legacy "item-…" shop pictures.
-- Only one teacher can exist until then.

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    execute 'drop policy if exists "Public avatar access" on storage.objects';
    execute 'drop policy if exists "Authenticated avatar uploads" on storage.objects';
    execute 'drop policy if exists "Authenticated avatar updates" on storage.objects';
    execute 'drop policy if exists "Users read their own avatar files" on storage.objects';
    execute 'drop policy if exists "Users upload their own avatar files" on storage.objects';
    execute 'drop policy if exists "Users replace their own avatar files" on storage.objects';

    execute $p$
      create policy "Users read their own avatar files" on storage.objects for select to authenticated
      using (bucket_id = 'avatars' and (left(name, 36) = (select auth.uid())::text or (select private.is_teacher())))
    $p$;
    execute $p$
      create policy "Users upload their own avatar files" on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars' and (left(name, 36) = (select auth.uid())::text or (select private.is_teacher())))
    $p$;
    execute $p$
      create policy "Users replace their own avatar files" on storage.objects for update to authenticated
      using (bucket_id = 'avatars' and (left(name, 36) = (select auth.uid())::text or (select private.is_teacher())))
      with check (bucket_id = 'avatars' and (left(name, 36) = (select auth.uid())::text or (select private.is_teacher())))
    $p$;

    execute 'drop policy if exists "Public market image access" on storage.objects';
    execute 'drop policy if exists "Teacher uploads market images" on storage.objects';
    execute 'drop policy if exists "Teacher updates market images" on storage.objects';
    execute 'drop policy if exists "Teacher deletes market images" on storage.objects';
    execute 'drop policy if exists "Teacher reads their own market images" on storage.objects';
    execute 'drop policy if exists "Teacher uploads their own market images" on storage.objects';
    execute 'drop policy if exists "Teacher replaces their own market images" on storage.objects';
    execute 'drop policy if exists "Teacher deletes their own market images" on storage.objects';

    execute $p$
      create policy "Teacher reads their own market images" on storage.objects for select to authenticated
      using (bucket_id = 'market' and (select private.is_teacher())
             and (left(name, 36) = (select auth.uid())::text or name like 'item-%'))
    $p$;
    execute $p$
      create policy "Teacher uploads their own market images" on storage.objects for insert to authenticated
      with check (bucket_id = 'market' and (select private.is_teacher())
                  and (left(name, 36) = (select auth.uid())::text or name like 'item-%'))
    $p$;
    execute $p$
      create policy "Teacher replaces their own market images" on storage.objects for update to authenticated
      using (bucket_id = 'market' and (select private.is_teacher())
             and (left(name, 36) = (select auth.uid())::text or name like 'item-%'))
      with check (bucket_id = 'market' and (select private.is_teacher())
                  and (left(name, 36) = (select auth.uid())::text or name like 'item-%'))
    $p$;
    execute $p$
      create policy "Teacher deletes their own market images" on storage.objects for delete to authenticated
      using (bucket_id = 'market' and (select private.is_teacher())
             and (left(name, 36) = (select auth.uid())::text or name like 'item-%'))
    $p$;
  end if;
end $$;
