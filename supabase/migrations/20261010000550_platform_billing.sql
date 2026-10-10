-- Chaqqon-chaqqon as a platform: the superadmin, tariffs, and what a teacher pays.
--
-- * The superadmin (role 'admin') owns the platform: creates teacher accounts, sets their tariff
--   and records the money they pay. The admin sees teachers and numbers, never a student's data.
-- * A tariff sets the monthly fee, the student limit and which sections are open to the teacher
--   and to their students.
-- * A teacher has a balance: a ledger of payments, bonuses and adjustments the admin records, and
--   monthly charges the database takes on the teacher's billing day. A charge the balance cannot
--   cover makes the teacher overdue; after 7 days management is blocked until they pay. The
--   teacher's students are not limited by it.
--
-- The rules mirror src/domain/teacherBilling.ts; schema.test.ts checks that both agree.
-- Safe to apply twice.

-- ---------------------------------------------------------------------------
-- 1. The superadmin
-- ---------------------------------------------------------------------------

do $$
declare
  v_name text;
begin
  for v_name in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like 'CHECK ((role = ANY %'
  loop
    execute format('alter table public.profiles drop constraint %I', v_name);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'teacher', 'student'));

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- 2. Tariffs
-- ---------------------------------------------------------------------------

create table if not exists public.tariffs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  monthly_price bigint not null check (monthly_price between 0 and 1000000000),
  max_students integer check (max_students is null or max_students > 0),
  features text[] not null default '{}' check (
    features <@ array[
      'homework_rooms', 'classroom', 'market', 'leaderboard', 'stats',
      'worksheet', 'written_homework', 'extra_drills', 'telegram'
    ]::text[]
  ),
  description text not null default '' check (length(description) <= 500),
  is_public boolean not null default false,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Teachers: the platform side of a teacher account
-- ---------------------------------------------------------------------------

create table if not exists public.teachers (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  tariff_id uuid not null references public.tariffs (id) on delete restrict,
  -- The first billing day; null while the teacher is not billed.
  billing_starts_on date,
  phone text not null default '' check (length(phone) <= 30),
  -- Optional, plain text: many teachers work without a centre.
  center_name text not null default '' check (length(center_name) <= 100),
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teachers_tariff_id_idx on public.teachers (tariff_id);

-- ---------------------------------------------------------------------------
-- 4. The teacher's ledger: append-only, corrections are adjustments
-- ---------------------------------------------------------------------------

create table if not exists public.teacher_ledger (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (profile_id) on delete cascade,
  kind text not null check (kind in ('payment', 'bonus', 'adjustment', 'charge')),
  amount bigint not null check (amount <> 0 and abs(amount) <= 1000000000),
  -- The month a charge pays for.
  period_start date,
  -- The tariff a charge was taken for, as it was then.
  tariff_id uuid references public.tariffs (id) on delete set null,
  note text not null default '' check (length(note) <= 300),
  recorded_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint teacher_ledger_sign check (
    (kind in ('payment', 'bonus') and amount > 0) or (kind = 'charge' and amount < 0) or kind = 'adjustment'
  ),
  constraint teacher_ledger_period check ((kind = 'charge') = (period_start is not null)),
  -- A month is charged once; other rows have no period and never collide.
  constraint teacher_ledger_charge_once unique (teacher_id, period_start)
);

create index if not exists teacher_ledger_teacher_id_idx on public.teacher_ledger (teacher_id, created_at);
create index if not exists teacher_ledger_tariff_id_idx on public.teacher_ledger (tariff_id);
create index if not exists teacher_ledger_recorded_by_idx on public.teacher_ledger (recorded_by);

-- ---------------------------------------------------------------------------
-- 5. Platform settings: how teachers reach the admin to pay
-- ---------------------------------------------------------------------------

create table if not exists public.platform_settings (
  id boolean primary key default true check (id),
  contact_phone text not null default '' check (length(contact_phone) <= 30),
  contact_telegram text not null default '' check (length(contact_telegram) <= 40),
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

-- Reminders already sent, so each goes out once.
create table if not exists private.billing_reminders (
  teacher_id uuid not null references public.teachers (profile_id) on delete cascade,
  kind text not null,
  for_date date not null,
  sent_at timestamptz not null default now(),
  primary key (teacher_id, kind, for_date)
);

revoke all on private.billing_reminders from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. The existing teacher gets a free tariff with every section, and is not billed until the admin
--    sets it up
-- ---------------------------------------------------------------------------

do $$
declare
  v_tariff uuid;
begin
  if exists (
    select 1 from public.profiles p
    where p.role = 'teacher' and not exists (select 1 from public.teachers t where t.profile_id = p.id)
  ) then
    select id into v_tariff from public.tariffs where name = 'Legacy' order by created_at limit 1;
    if v_tariff is null then
      insert into public.tariffs (name, monthly_price, max_students, features, description, is_public, sort_order)
      values (
        'Legacy', 0, null,
        array['homework_rooms', 'classroom', 'market', 'leaderboard', 'stats',
              'worksheet', 'written_homework', 'extra_drills', 'telegram'],
        'Platformadan oldingi ustoz uchun', false, 999
      )
      returning id into v_tariff;
    end if;

    insert into public.teachers (profile_id, tariff_id)
    select p.id, v_tariff from public.profiles p
    where p.role = 'teacher' and not exists (select 1 from public.teachers t where t.profile_id = p.id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Billing rules
-- ---------------------------------------------------------------------------

-- Takes every monthly fee that is due by p_today and not yet taken. Always counted from the first
-- billing day (Jan 31 → Feb 28 → Mar 31). The calendar month difference may overshoot by one; the
-- date filter trims it. A disabled teacher or a free tariff is not charged.
create or replace function private.generate_teacher_charges(
  p_today date default private.school_today(),
  p_teacher uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.teacher_ledger (teacher_id, kind, amount, period_start, tariff_id, note, recorded_by)
  select t.profile_id, 'charge', -tr.monthly_price, ps.d, tr.id, tr.name, null
  from public.teachers t
  join public.tariffs tr on tr.id = t.tariff_id
  cross join lateral (
    select (t.billing_starts_on + make_interval(months => k))::date as d
    from generate_series(
      0,
      ((extract(year from p_today) - extract(year from t.billing_starts_on)) * 12
        + extract(month from p_today) - extract(month from t.billing_starts_on))::int
    ) k
  ) ps
  where t.billing_starts_on is not null
    and t.billing_starts_on <= p_today
    and t.disabled_at is null
    and tr.monthly_price > 0
    and ps.d <= p_today
    and (p_teacher is null or t.profile_id = p_teacher)
  on conflict (teacher_id, period_start) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Balance, the month the teacher owes for (the oldest charge that payments, bonuses and adjustments
-- do not cover, charges taken oldest first) and whether management is blocked.
create or replace function private.teacher_billing_state(
  p_teacher uuid,
  p_today date default private.school_today()
)
returns table (balance bigint, overdue_since date, blocked boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with e as (
    select kind, amount, period_start from public.teacher_ledger where teacher_id = p_teacher
  ),
  credit as (
    select coalesce(sum(amount), 0) as total from e where kind <> 'charge'
  ),
  charges as (
    select period_start,
           sum(-amount) over (order by period_start rows between unbounded preceding and current row) as due
    from e where kind = 'charge'
  ),
  f as (
    select min(c.period_start) as since from charges c, credit where c.due > credit.total
  )
  select
    (select coalesce(sum(amount), 0)::bigint from e),
    f.since,
    coalesce(f.since + 7 <= p_today, false)
      or exists (select 1 from public.teachers t where t.profile_id = p_teacher and t.disabled_at is not null)
  from f;
$$;

create or replace function private.teacher_blocked(p_teacher uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.blocked from private.teacher_billing_state(p_teacher) s), false);
$$;

-- A teacher whose management is open.
create or replace function private.i_can_manage()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_teacher() and not private.teacher_blocked((select auth.uid()));
$$;

create or replace function private.teacher_has_feature(p_teacher uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.teachers t
    join public.tariffs tr on tr.id = t.tariff_id
    where t.profile_id = p_teacher and p_feature = any (tr.features)
  );
$$;

-- For a teacher: their own tariff. For a student: their teacher's.
create or replace function private.my_teacher_has_feature(p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.teacher_has_feature(private.my_teacher_id(), p_feature);
$$;

create or replace function private.my_tariff_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.tariff_id from public.teachers t where t.profile_id = private.my_teacher_id();
$$;

-- Money as teachers read it: "−150 000 so'm".
create or replace function private.format_som(p_amount bigint)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_amount < 0 then '−' else '' end
    || regexp_replace(abs(p_amount)::text, '(\d)(?=(\d{3})+$)', '\1 ', 'g')
    || ' so''m';
$$;

revoke execute on function
  private.is_admin(),
  private.generate_teacher_charges(date, uuid),
  private.teacher_billing_state(uuid, date),
  private.teacher_blocked(uuid),
  private.i_can_manage(),
  private.teacher_has_feature(uuid, text),
  private.my_teacher_has_feature(text),
  private.my_tariff_id(),
  private.format_som(bigint)
from public;
grant execute on function
  private.is_admin(),
  private.teacher_blocked(uuid),
  private.i_can_manage(),
  private.teacher_has_feature(uuid, text),
  private.my_teacher_has_feature(text),
  private.my_tariff_id()
to authenticated, service_role;
-- Takes a date: never callable from the app.
grant execute on function
  private.generate_teacher_charges(date, uuid),
  private.teacher_billing_state(uuid, date),
  private.format_som(bigint)
to service_role;

-- ---------------------------------------------------------------------------
-- 8. Privileges and row-level security for the new tables
-- ---------------------------------------------------------------------------

revoke all on public.tariffs, public.teachers, public.teacher_ledger, public.platform_settings
  from anon, authenticated;

grant select on public.tariffs to anon, authenticated;
grant insert (name, monthly_price, max_students, features, description, is_public, sort_order)
  on public.tariffs to authenticated;
grant update (name, monthly_price, max_students, features, description, is_public, sort_order, archived_at, updated_at)
  on public.tariffs to authenticated;

-- Teachers change their row only through RPCs: column grants cannot tell a teacher from the admin.
grant select on public.teachers to authenticated;

grant select on public.teacher_ledger to authenticated;
grant insert (teacher_id, kind, amount, note) on public.teacher_ledger to authenticated;

grant select on public.platform_settings to anon, authenticated;
grant update (contact_phone, contact_telegram, updated_at) on public.platform_settings to authenticated;

alter table public.tariffs enable row level security;
alter table public.teachers enable row level security;
alter table public.teacher_ledger enable row level security;
alter table public.platform_settings enable row level security;

drop policy if exists "Guests read offered tariffs" on public.tariffs;
create policy "Guests read offered tariffs"
  on public.tariffs for select to anon
  using (is_public and archived_at is null);

drop policy if exists "Users read offered tariffs and their own" on public.tariffs;
create policy "Users read offered tariffs and their own"
  on public.tariffs for select to authenticated
  using (
    (is_public and archived_at is null)
    or id = (select private.my_tariff_id())
    or (select private.is_admin())
  );

drop policy if exists "Admin adds tariffs" on public.tariffs;
create policy "Admin adds tariffs"
  on public.tariffs for insert to authenticated
  with check ((select private.is_admin()));

drop policy if exists "Admin changes tariffs" on public.tariffs;
create policy "Admin changes tariffs"
  on public.tariffs for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Teachers read their own row, the admin all" on public.teachers;
create policy "Teachers read their own row, the admin all"
  on public.teachers for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "Teachers read their own ledger, the admin all" on public.teacher_ledger;
create policy "Teachers read their own ledger, the admin all"
  on public.teacher_ledger for select to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_admin()));

-- The admin records money; charges only ever come from the database.
drop policy if exists "Admin records payments, bonuses and adjustments" on public.teacher_ledger;
create policy "Admin records payments, bonuses and adjustments"
  on public.teacher_ledger for insert to authenticated
  with check ((select private.is_admin()) and kind in ('payment', 'bonus', 'adjustment'));

drop policy if exists "Everyone reads the platform contact" on public.platform_settings;
create policy "Everyone reads the platform contact"
  on public.platform_settings for select to anon, authenticated
  using (true);

drop policy if exists "Admin changes the platform contact" on public.platform_settings;
create policy "Admin changes the platform contact"
  on public.platform_settings for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- A teacher's banner and lock page update the moment the admin records a payment.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['tariffs', 'teachers', 'teacher_ledger', 'platform_settings'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Management closes for a blocked teacher, and each section only opens with its feature
-- ---------------------------------------------------------------------------

drop policy if exists "Teacher updates their own students' profiles" on public.profiles;
create policy "Teacher updates their own students' profiles"
  on public.profiles for update to authenticated
  using (role = 'student' and teacher_id = (select auth.uid()))
  with check (role = 'student' and teacher_id = (select auth.uid()) and (select private.i_can_manage()));

drop policy if exists "Teacher records payments for their own students" on public.student_payments;
create policy "Teacher records payments for their own students"
  on public.student_payments for insert to authenticated
  with check (
    student_id in (select private.my_student_ids())
    and (select private.i_can_manage())
    and paid_until > (select private.school_today())
    and paid_until <= ((select private.school_today()) + interval '24 months')::date
  );

drop policy if exists "Teacher takes back their own students' payments" on public.student_payments;
create policy "Teacher takes back their own students' payments"
  on public.student_payments for delete to authenticated
  using (student_id in (select private.my_student_ids()) and (select private.i_can_manage()));

-- Rooms are the interactive homework.
drop policy if exists "Teacher opens rooms for their own students" on public.rooms;
create policy "Teacher opens rooms for their own students"
  on public.rooms for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and (select private.i_can_manage())
    and (select private.my_teacher_has_feature('homework_rooms'))
    and private.only_my_students(participant_ids)
  );

drop policy if exists "Teacher updates their own rooms" on public.rooms;
create policy "Teacher updates their own rooms"
  on public.rooms for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and (select private.i_can_manage())
    and private.only_my_students(participant_ids)
  );

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
      and (select private.i_can_manage())
      and (select private.my_teacher_has_feature('classroom'))
      and private.is_my_student(student_id)
    )
  );

drop policy if exists "Teacher records homework for their own students" on public.written_homework;
create policy "Teacher records homework for their own students"
  on public.written_homework for insert to authenticated
  with check (
    student_id in (select private.my_student_ids())
    and (select private.i_can_manage())
    and (select private.my_teacher_has_feature('written_homework'))
  );

drop policy if exists "Teacher updates their own students' homework" on public.written_homework;
create policy "Teacher updates their own students' homework"
  on public.written_homework for update to authenticated
  using (student_id in (select private.my_student_ids()))
  with check (
    student_id in (select private.my_student_ids())
    and (select private.i_can_manage())
    and (select private.my_teacher_has_feature('written_homework'))
  );

drop policy if exists "Teacher deletes their own students' homework" on public.written_homework;
create policy "Teacher deletes their own students' homework"
  on public.written_homework for delete to authenticated
  using (student_id in (select private.my_student_ids()) and (select private.i_can_manage()));

drop policy if exists "Teacher adds market items" on public.market_items;
create policy "Teacher adds market items"
  on public.market_items for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and (select private.i_can_manage())
    and (select private.my_teacher_has_feature('market'))
  );

drop policy if exists "Teacher updates their own market items" on public.market_items;
create policy "Teacher updates their own market items"
  on public.market_items for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and (select private.i_can_manage())
    and (select private.my_teacher_has_feature('market'))
  );

drop policy if exists "Teacher deletes their own market items" on public.market_items;
create policy "Teacher deletes their own market items"
  on public.market_items for delete to authenticated
  using (teacher_id = (select auth.uid()) and (select private.i_can_manage()));

drop policy if exists "Teacher updates their own students' orders" on public.market_orders;
create policy "Teacher updates their own students' orders"
  on public.market_orders for update to authenticated
  using (student_id in (select private.my_student_ids()))
  with check (student_id in (select private.my_student_ids()) and (select private.i_can_manage()));

-- Orders go through place_order(), which checks stock and stars in one step.
drop policy if exists "Paid students order from their teacher's shop" on public.market_orders;
revoke insert on public.market_orders from authenticated;

create or replace function public.place_order(p_item_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_teacher uuid;
  v_item public.market_items%rowtype;
  v_balance bigint;
  v_order uuid;
begin
  -- One order at a time per student, so two taps cannot spend the same stars twice.
  select teacher_id into v_teacher from public.profiles where id = v_me and role = 'student' for update;
  if v_teacher is null or not private.has_access(v_me) then
    raise exception 'FORBIDDEN';
  end if;
  if not private.teacher_has_feature(v_teacher, 'market') then
    raise exception 'FEATURE_DISABLED';
  end if;

  select * into v_item from public.market_items
  where id = p_item_id and teacher_id = v_teacher
  for update;
  if not found then
    raise exception 'ITEM_NOT_FOUND';
  end if;
  if v_item.stock is not null and v_item.stock <= 0 then
    raise exception 'OUT_OF_STOCK';
  end if;

  select coalesce(sum(delta), 0) into v_balance from public.star_awards where student_id = v_me;
  if v_balance < v_item.cost_stars then
    raise exception 'INSUFFICIENT_STARS';
  end if;

  if v_item.stock is not null then
    update public.market_items set stock = stock - 1 where id = v_item.id;
  end if;

  insert into public.market_orders (student_id, item_id, item_title, cost_stars)
  values (v_me, v_item.id, v_item.title, v_item.cost_stars)
  returning id into v_order;
  return v_order;
end;
$$;

revoke execute on function public.place_order(uuid) from public, anon;
grant execute on function public.place_order(uuid) to authenticated, service_role;

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
  if not private.i_can_manage() then
    raise exception 'TEACHER_BLOCKED';
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

-- A new student needs an open teacher with room on their tariff. The teacher's row is locked so two
-- students added at once cannot both take the last place.
create or replace function private.check_student_teacher()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer;
begin
  if new.role <> 'student' then
    return new;
  end if;
  if not exists (select 1 from public.profiles t where t.id = new.teacher_id and t.role = 'teacher') then
    raise exception 'A student''s teacher_id must name a teacher';
  end if;

  if tg_op = 'INSERT' then
    select tr.max_students into v_max
    from public.teachers t
    join public.tariffs tr on tr.id = t.tariff_id
    where t.profile_id = new.teacher_id
    for update of t;

    if private.teacher_blocked(new.teacher_id) then
      raise exception 'TEACHER_BLOCKED';
    end if;
    if v_max is not null and (
      select count(*) from public.profiles where teacher_id = new.teacher_id and role = 'student'
    ) >= v_max then
      raise exception 'STUDENT_LIMIT';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Storage: the transitional clauses from the tenancy migration go
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    execute 'drop policy if exists "Users read their own avatar files" on storage.objects';
    execute 'drop policy if exists "Users upload their own avatar files" on storage.objects';
    execute 'drop policy if exists "Users replace their own avatar files" on storage.objects';
    execute $p$
      create policy "Users read their own avatar files" on storage.objects for select to authenticated
      using (bucket_id = 'avatars' and left(name, 36) = (select auth.uid())::text)
    $p$;
    execute $p$
      create policy "Users upload their own avatar files" on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars' and left(name, 36) = (select auth.uid())::text)
    $p$;
    execute $p$
      create policy "Users replace their own avatar files" on storage.objects for update to authenticated
      using (bucket_id = 'avatars' and left(name, 36) = (select auth.uid())::text)
      with check (bucket_id = 'avatars' and left(name, 36) = (select auth.uid())::text)
    $p$;

    execute 'drop policy if exists "Teacher reads their own market images" on storage.objects';
    execute 'drop policy if exists "Teacher uploads their own market images" on storage.objects';
    execute 'drop policy if exists "Teacher replaces their own market images" on storage.objects';
    execute 'drop policy if exists "Teacher deletes their own market images" on storage.objects';
    execute $p$
      create policy "Teacher reads their own market images" on storage.objects for select to authenticated
      using (bucket_id = 'market' and (select private.is_teacher()) and left(name, 36) = (select auth.uid())::text)
    $p$;
    execute $p$
      create policy "Teacher uploads their own market images" on storage.objects for insert to authenticated
      with check (bucket_id = 'market' and (select private.i_can_manage()) and left(name, 36) = (select auth.uid())::text)
    $p$;
    execute $p$
      create policy "Teacher replaces their own market images" on storage.objects for update to authenticated
      using (bucket_id = 'market' and (select private.is_teacher()) and left(name, 36) = (select auth.uid())::text)
      with check (bucket_id = 'market' and (select private.i_can_manage()) and left(name, 36) = (select auth.uid())::text)
    $p$;
    execute $p$
      create policy "Teacher deletes their own market images" on storage.objects for delete to authenticated
      using (bucket_id = 'market' and (select private.is_teacher()) and left(name, 36) = (select auth.uid())::text)
    $p$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 11. Telegram: the tariff's feature gates class notifications; billing messages always go out
-- ---------------------------------------------------------------------------

-- The raw dispatcher, unchanged from the Telegram migration.
create or replace function private.send_telegram(p_profile_id uuid, p_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if p_profile_id is null or coalesce(p_text, '') = '' then
    return;
  end if;

  -- Best effort: a notification must never break the write that triggered it,
  -- and must be a no-op where Vault/pg_net are absent (e.g. the schema tests).
  begin
    select decrypted_secret into v_url
      from vault.decrypted_secrets where name = 'telegram_notify_url';
    select decrypted_secret into v_secret
      from vault.decrypted_secrets where name = 'telegram_notify_secret';

    if v_url is null or v_secret is null then
      return;
    end if;

    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('profile_id', p_profile_id, 'text', p_text),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-notify-secret', v_secret
      )
    );
  exception when others then
    return;
  end;
end;
$$;

-- Class notifications: only when the teacher's tariff includes Telegram. The admin always hears.
create or replace function private.notify_telegram(p_profile_id uuid, p_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_tenant uuid;
begin
  select role, coalesce(teacher_id, id) into v_role, v_tenant
  from public.profiles where id = p_profile_id;

  if v_role = 'admin' or private.teacher_has_feature(v_tenant, 'telegram') then
    perform private.send_telegram(p_profile_id, p_text);
  end if;
end;
$$;

revoke execute on function private.send_telegram(uuid, text) from public, anon, authenticated;
grant execute on function private.send_telegram(uuid, text) to service_role;

create or replace function private.platform_contact_line()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when s.contact_phone = '' and s.contact_telegram = '' then ''
    else E'\n📞 To''lov uchun: ' || concat_ws(' · ',
      nullif(private.html_escape(s.contact_phone), ''),
      nullif(private.html_escape(s.contact_telegram), ''))
  end
  from public.platform_settings s
  where s.id;
$$;

-- Sends a billing reminder once; true when it went out now.
drop function if exists private.send_billing_reminder(uuid, text, date, text);
create function private.send_billing_reminder(p_teacher uuid, p_kind text, p_for date, p_text text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.billing_reminders (teacher_id, kind, for_date)
  values (p_teacher, p_kind, p_for)
  on conflict do nothing;

  if not found then
    return false;
  end if;
  perform private.send_telegram(p_teacher, p_text || coalesce(private.platform_contact_line(), ''));
  return true;
end;
$$;

-- Reminders for the day: a charge left the balance negative, the block is 3 or 1 days away, the
-- block has started (the admin hears too), or the next charge is 3 days away and not covered.
create or replace function private.send_billing_reminders(p_today date default private.school_today())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_block date;
  v_next date;
  v_admin uuid;
begin
  for r in
    select t.profile_id, t.billing_starts_on, tr.monthly_price, s.balance, s.overdue_since, s.blocked,
           private.display_name(t.profile_id) as name
    from public.teachers t
    join public.tariffs tr on tr.id = t.tariff_id
    cross join lateral private.teacher_billing_state(t.profile_id, p_today) s
    where t.disabled_at is null
  loop
    if r.overdue_since is not null then
      v_block := r.overdue_since + 7;

      perform private.send_billing_reminder(
        r.profile_id, 'charge_negative', r.overdue_since,
        '💳 <b>Oylik to''lov yechildi</b>' || E'\n' ||
        'Balans: ' || private.format_som(r.balance) || E'\n' ||
        to_char(v_block, 'DD.MM.YYYY') || ' gacha to''lang — aks holda boshqaruv vaqtincha yopiladi.'
      );

      if v_block - p_today in (3, 1) then
        perform private.send_billing_reminder(
          r.profile_id, 'block_soon_' || (v_block - p_today), r.overdue_since,
          '⏳ <b>' || (v_block - p_today) || ' kundan keyin akkaunt bloklanadi</b>' || E'\n' ||
          'Balans: ' || private.format_som(r.balance)
        );
      end if;

      if r.blocked and private.send_billing_reminder(
        r.profile_id, 'blocked', r.overdue_since,
        '🔒 <b>Akkaunt bloklandi</b>' || E'\n' ||
        'Balans: ' || private.format_som(r.balance) || E'\n' ||
        'To''lov qilinishi bilan darhol ochiladi. O''quvchilaringiz mashq qilishda davom etadi.'
      ) then
        begin
          for v_admin in select id from public.profiles where role = 'admin' loop
            perform private.send_telegram(
              v_admin,
              '🔒 <b>' || private.html_escape(r.name) || '</b> bloklandi' || E'\n' ||
              'Balans: ' || private.format_som(r.balance)
            );
          end loop;
        end;
      end if;
    elsif r.billing_starts_on is not null and r.monthly_price > 0 then
      select min(d) into v_next
      from (
        select (r.billing_starts_on + make_interval(months => k))::date as d
        from generate_series(
          0,
          ((extract(year from p_today) - extract(year from r.billing_starts_on)) * 12
            + extract(month from p_today) - extract(month from r.billing_starts_on))::int + 1
        ) k
      ) candidates
      where d > p_today;

      if v_next - p_today = 3 and r.balance < r.monthly_price then
        perform private.send_billing_reminder(
          r.profile_id, 'due_soon', v_next,
          '🔔 <b>3 kundan keyin oylik to''lov</b>' || E'\n' ||
          private.format_som(r.monthly_price) || ' yechiladi. Balans: ' || private.format_som(r.balance)
        );
      end if;
    end if;
  end loop;
end;
$$;

create or replace function private.run_daily_billing()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.generate_teacher_charges();
  perform private.send_billing_reminders();
end;
$$;

-- A payment is confirmed to the teacher straight away.
create or replace function private.on_teacher_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.send_telegram(
    new.teacher_id,
    '✅ <b>To''lov qabul qilindi</b>' || E'\n' ||
    '+' || private.format_som(new.amount) || E'\n' ||
    'Balans: ' || private.format_som(
      (select coalesce(sum(amount), 0)::bigint from public.teacher_ledger where teacher_id = new.teacher_id)
    )
  );
  return new;
end;
$$;

drop trigger if exists teacher_ledger_payment_notify on public.teacher_ledger;
create trigger teacher_ledger_payment_notify
  after insert on public.teacher_ledger
  for each row when (new.kind = 'payment')
  execute function private.on_teacher_payment();

revoke execute on function
  private.platform_contact_line(),
  private.send_billing_reminder(uuid, text, date, text),
  private.send_billing_reminders(date),
  private.run_daily_billing()
from public, anon, authenticated;
grant execute on function
  private.platform_contact_line(),
  private.send_billing_reminder(uuid, text, date, text),
  private.send_billing_reminders(date),
  private.run_daily_billing()
to service_role;

-- Every night at 00:05 Tashkent. Guarded: the embedded Postgres in the tests has no pg_cron.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('teacher-billing-daily', '5 19 * * *', 'select private.run_daily_billing()');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 12. What the app calls
-- ---------------------------------------------------------------------------

-- The sections open to the caller: a teacher's tariff, a student's teacher's, everything for the admin.
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
      'worksheet', 'written_homework', 'extra_drills', 'telegram']
    else coalesce((
      select tr.features from public.teachers t
      join public.tariffs tr on tr.id = t.tariff_id
      where t.profile_id = private.my_teacher_id()
    ), '{}')
  end;
$$;

-- The signed-in teacher's account: profile, tariff, class size and ledger, with any due charge taken.
create or replace function public.my_teacher_account()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if not private.is_teacher() then
    raise exception 'FORBIDDEN';
  end if;
  perform private.generate_teacher_charges(private.school_today(), v_me);

  return (
    select jsonb_build_object(
      'firstName', p.first_name,
      'lastName', p.last_name,
      'username', p.username,
      'phone', t.phone,
      'centerName', t.center_name,
      'billingStartsOn', t.billing_starts_on,
      'disabledAt', t.disabled_at,
      'tariff', to_jsonb(tr),
      'studentCount', (select count(*) from public.profiles s where s.teacher_id = v_me and s.role = 'student'),
      'ledger', coalesce((
        select jsonb_agg(to_jsonb(l) order by l.created_at)
        from public.teacher_ledger l where l.teacher_id = v_me
      ), '[]'::jsonb)
    )
    from public.profiles p
    join public.teachers t on t.profile_id = p.id
    join public.tariffs tr on tr.id = t.tariff_id
    where p.id = v_me
  );
end;
$$;

create or replace function public.update_my_teacher_profile(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_center_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if not private.is_teacher() then
    raise exception 'FORBIDDEN';
  end if;
  if length(trim(coalesce(p_first_name, ''))) = 0 or length(p_first_name) > 60 or length(coalesce(p_last_name, '')) > 60 then
    raise exception 'BAD_REQUEST';
  end if;

  update public.profiles
  set first_name = trim(p_first_name), last_name = trim(coalesce(p_last_name, ''))
  where id = v_me;
  update public.teachers
  set phone = trim(coalesce(p_phone, '')), center_name = trim(coalesce(p_center_name, '')), updated_at = now()
  where profile_id = v_me;
end;
$$;

-- Every teacher with their class counted for the period. Counts only: no student is named.
create or replace function public.admin_teacher_overview(p_from date, p_to date)
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  phone text,
  center_name text,
  tariff_id uuid,
  billing_starts_on date,
  disabled_at timestamptz,
  created_at timestamptz,
  student_count integer,
  active_students integer,
  open_students integer,
  new_students integer,
  practice_count integer,
  correct_answers integer,
  total_answers integer,
  homework_rooms integer
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not private.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  perform private.generate_teacher_charges();

  return query
  select
    p.id, p.username, p.first_name, p.last_name, t.phone, t.center_name, t.tariff_id,
    t.billing_starts_on, t.disabled_at, t.created_at,
    coalesce(s.student_count, 0)::integer,
    coalesce(s.active_students, 0)::integer,
    coalesce(s.open_students, 0)::integer,
    coalesce(s.new_students, 0)::integer,
    coalesce(r.practice_count, 0)::integer,
    coalesce(r.correct_answers, 0)::integer,
    coalesce(r.total_answers, 0)::integer,
    coalesce(h.homework_rooms, 0)::integer
  from public.teachers t
  join public.profiles p on p.id = t.profile_id
  left join lateral (
    select
      count(*) as student_count,
      count(*) filter (where st.last_active_at >= now() - interval '7 days') as active_students,
      count(*) filter (where private.has_access(st.id)) as open_students,
      count(*) filter (
        where ((st.created_at at time zone 'UTC') + interval '5 hours')::date between p_from and p_to
      ) as new_students
    from public.profiles st
    where st.teacher_id = t.profile_id and st.role = 'student'
  ) s on true
  left join lateral (
    select count(*) as practice_count, sum(pr.correct) as correct_answers, sum(pr.total) as total_answers
    from public.practice_results pr
    join public.profiles st on st.id = pr.student_id
    where st.teacher_id = t.profile_id
      and ((pr.completed_at at time zone 'UTC') + interval '5 hours')::date between p_from and p_to
  ) r on true
  left join lateral (
    select count(*) as homework_rooms
    from public.rooms ro
    where ro.teacher_id = t.profile_id
      and ((ro.created_at at time zone 'UTC') + interval '5 hours')::date between p_from and p_to
  ) h on true
  order by t.created_at;
end;
$$;

-- Changes a teacher's profile and subscription. The first billing day is fixed once a fee has been
-- taken, since moving it would charge a month twice.
create or replace function public.admin_update_teacher(
  p_teacher uuid,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_center_name text,
  p_tariff_id uuid,
  p_billing_starts_on date,
  p_disabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current date;
begin
  if not private.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  select billing_starts_on into v_current from public.teachers where profile_id = p_teacher for update;
  if not found then
    raise exception 'TEACHER_NOT_FOUND';
  end if;
  if not exists (select 1 from public.tariffs where id = p_tariff_id) then
    raise exception 'TARIFF_NOT_FOUND';
  end if;
  if p_billing_starts_on is distinct from v_current
     and exists (select 1 from public.teacher_ledger where teacher_id = p_teacher and kind = 'charge') then
    raise exception 'BILLING_STARTED';
  end if;
  if length(trim(coalesce(p_first_name, ''))) = 0 then
    raise exception 'BAD_REQUEST';
  end if;

  update public.profiles
  set first_name = trim(p_first_name), last_name = trim(coalesce(p_last_name, ''))
  where id = p_teacher and role = 'teacher';

  update public.teachers
  set phone = trim(coalesce(p_phone, '')),
      center_name = trim(coalesce(p_center_name, '')),
      tariff_id = p_tariff_id,
      billing_starts_on = p_billing_starts_on,
      disabled_at = case when p_disabled then coalesce(disabled_at, now()) end,
      updated_at = now()
  where profile_id = p_teacher;

  perform private.generate_teacher_charges(private.school_today(), p_teacher);
end;
$$;

-- Used by the manage-teachers Edge Function after it creates the sign-in: the teacher's profile, their
-- platform row and an optional welcome bonus, together.
create or replace function public.create_teacher_records(
  p_id uuid,
  p_username text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_center_name text,
  p_tariff_id uuid,
  p_billing_starts_on date,
  p_bonus bigint,
  p_admin uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.tariffs where id = p_tariff_id) then
    raise exception 'TARIFF_NOT_FOUND';
  end if;

  insert into public.profiles (id, role, username, first_name, last_name)
  values (p_id, 'teacher', p_username, trim(p_first_name), trim(coalesce(p_last_name, '')));

  insert into public.teachers (profile_id, tariff_id, billing_starts_on, phone, center_name)
  values (p_id, p_tariff_id, p_billing_starts_on, trim(coalesce(p_phone, '')), trim(coalesce(p_center_name, '')));

  if coalesce(p_bonus, 0) > 0 then
    insert into public.teacher_ledger (teacher_id, kind, amount, note, recorded_by)
    values (p_id, 'bonus', p_bonus, 'Boshlang''ich bonus', p_admin);
  end if;

  perform private.generate_teacher_charges(private.school_today(), p_id);
end;
$$;

-- What manage-students checks before it creates a sign-in: the database enforces the same rules.
create or replace function public.teacher_guard(p_teacher uuid)
returns table (blocked boolean, student_count integer, max_students integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.teacher_blocked(p_teacher),
    (select count(*)::integer from public.profiles where teacher_id = p_teacher and role = 'student'),
    tr.max_students
  from public.teachers t
  join public.tariffs tr on tr.id = t.tariff_id
  where t.profile_id = p_teacher;
$$;

revoke execute on function
  public.my_features(),
  public.my_teacher_account(),
  public.update_my_teacher_profile(text, text, text, text),
  public.admin_teacher_overview(date, date),
  public.admin_update_teacher(uuid, text, text, text, text, uuid, date, boolean),
  public.create_teacher_records(uuid, text, text, text, text, text, uuid, date, bigint, uuid),
  public.teacher_guard(uuid)
from public, anon;
grant execute on function
  public.my_features(),
  public.my_teacher_account(),
  public.update_my_teacher_profile(text, text, text, text),
  public.admin_teacher_overview(date, date),
  public.admin_update_teacher(uuid, text, text, text, text, uuid, date, boolean)
to authenticated, service_role;
-- Only the Edge Functions, after their own checks.
revoke execute on function
  public.create_teacher_records(uuid, text, text, text, text, text, uuid, date, bigint, uuid),
  public.teacher_guard(uuid)
from authenticated;
grant execute on function
  public.create_teacher_records(uuid, text, text, text, text, text, uuid, date, bigint, uuid),
  public.teacher_guard(uuid)
to service_role;
