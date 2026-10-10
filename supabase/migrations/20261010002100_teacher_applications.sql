-- Teachers apply from the landing page; the superadmin calls them back and creates their account.
--
-- Guests never touch the table: they call submit_teacher_application(), which checks the input and
-- throttles floods (per hour overall, per phone per day). Only the admin reads and updates
-- applications. A new one is sent to every admin on Telegram.
--
-- The single-teacher sign-up is gone with it: teacher_exists() was only there for that.
-- Safe to apply twice.

create table if not exists public.teacher_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 2 and 80),
  phone text not null check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  students_count integer check (students_count is null or students_count between 0 and 10000),
  telegram_username text not null default '' check (length(telegram_username) <= 40),
  city text not null default '' check (length(city) <= 60),
  center_name text not null default '' check (length(center_name) <= 100),
  heard_from text not null default '' check (length(heard_from) <= 100),
  tariff_id uuid references public.tariffs (id) on delete set null,
  note text not null default '' check (length(note) <= 1000),
  status text not null default 'new' check (status in ('new', 'contacted', 'approved', 'rejected')),
  teacher_id uuid references public.profiles (id) on delete set null,
  handled_by uuid references public.profiles (id) on delete set null,
  admin_note text not null default '' check (length(admin_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_applications_status_idx on public.teacher_applications (status, created_at desc);
create index if not exists teacher_applications_created_at_idx on public.teacher_applications (created_at);
create index if not exists teacher_applications_tariff_id_idx on public.teacher_applications (tariff_id);
create index if not exists teacher_applications_teacher_id_idx on public.teacher_applications (teacher_id);
create index if not exists teacher_applications_handled_by_idx on public.teacher_applications (handled_by);

revoke all on public.teacher_applications from anon, authenticated;
grant select on public.teacher_applications to authenticated;
grant update (status, teacher_id, admin_note) on public.teacher_applications to authenticated;

alter table public.teacher_applications enable row level security;

drop policy if exists "Admin reads applications" on public.teacher_applications;
create policy "Admin reads applications"
  on public.teacher_applications for select to authenticated
  using ((select private.is_admin()));

drop policy if exists "Admin handles applications" on public.teacher_applications;
create policy "Admin handles applications"
  on public.teacher_applications for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Who handled it and when, without trusting the client.
create or replace function private.stamp_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.handled_by := (select auth.uid());
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists teacher_applications_stamp on public.teacher_applications;
create trigger teacher_applications_stamp
  before update on public.teacher_applications
  for each row execute function private.stamp_application();

do $$
begin
  alter publication supabase_realtime add table public.teacher_applications;
exception
  when duplicate_object then null;
end $$;

-- The landing page's form. Returns nothing: a guest learns only that it went through.
create or replace function public.submit_teacher_application(
  p_full_name text,
  p_phone text,
  p_students_count integer default null,
  p_telegram_username text default '',
  p_city text default '',
  p_center_name text default '',
  p_heard_from text default '',
  p_tariff_id uuid default null,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := trim(coalesce(p_phone, ''));
  v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  if length(trim(coalesce(p_full_name, ''))) < 2 or v_phone !~ '^\+?[0-9 ()-]{7,20}$' then
    raise exception 'INVALID_APPLICATION';
  end if;

  -- A flood guard, not a lock: a real teacher never sends this many.
  if (select count(*) from public.teacher_applications where created_at > now() - interval '1 hour') >= 30
     or (
       select count(*) from public.teacher_applications
       where regexp_replace(phone, '[^0-9]', '', 'g') = v_digits and created_at > now() - interval '1 day'
     ) >= 3 then
    raise exception 'TOO_MANY_APPLICATIONS';
  end if;

  insert into public.teacher_applications (
    full_name, phone, students_count, telegram_username, city, center_name, heard_from, tariff_id, note
  )
  values (
    trim(p_full_name),
    v_phone,
    p_students_count,
    left(trim(coalesce(p_telegram_username, '')), 40),
    left(trim(coalesce(p_city, '')), 60),
    left(trim(coalesce(p_center_name, '')), 100),
    left(trim(coalesce(p_heard_from, '')), 100),
    -- Only a tariff that is actually on offer is kept.
    (select id from public.tariffs where id = p_tariff_id and is_public and archived_at is null),
    left(trim(coalesce(p_note, '')), 1000)
  );
end;
$$;

revoke execute on function public.submit_teacher_application(text, text, integer, text, text, text, text, uuid, text)
  from public;
grant execute on function public.submit_teacher_application(text, text, integer, text, text, text, text, uuid, text)
  to anon, authenticated, service_role;

-- Every admin hears about a new application at once.
create or replace function private.on_teacher_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid;
  v_text text;
begin
  v_text := '📝 <b>Yangi ariza</b>' || E'\n' ||
    private.html_escape(new.full_name) || E'\n' ||
    '📞 ' || private.html_escape(new.phone) ||
    case when new.telegram_username <> '' then ' · ' || private.html_escape(new.telegram_username) else '' end ||
    case when new.students_count is not null then E'\n👥 ' || new.students_count || ' o''quvchi' else '' end ||
    case when new.city <> '' then E'\n📍 ' || private.html_escape(new.city) else '' end ||
    case when new.center_name <> '' then E'\n🏫 ' || private.html_escape(new.center_name) else '' end ||
    coalesce(E'\n🏷 ' || private.html_escape((select name from public.tariffs where id = new.tariff_id)), '') ||
    case when new.heard_from <> '' then E'\n🔎 ' || private.html_escape(new.heard_from) else '' end;

  for v_admin in select id from public.profiles where role = 'admin' loop
    perform private.send_telegram(v_admin, v_text);
  end loop;
  return new;
end;
$$;

drop trigger if exists teacher_applications_notify on public.teacher_applications;
create trigger teacher_applications_notify
  after insert on public.teacher_applications
  for each row execute function private.on_teacher_application();

-- Teachers no longer sign themselves up.
drop function if exists public.teacher_exists();
