-- What helps a teacher decide to join, and keeps the admin on top of the ones who asked.
--
-- 1. One tariff can be marked as recommended; the landing page singles it out.
-- 2. The admin sets the offer: free trial days for a new teacher, a money-back period (0 hides it)
--    and whether a teacher who brings a colleague is rewarded.
-- 3. An application may name the teacher who recommended the platform.
-- 4. Guests see real numbers: teachers, students and correct answers so far. Aggregates only.
-- 5. Every morning the admins hear about applications nobody has answered for a day.
-- Safe to apply twice.

-- ---------------------------------------------------------------------------
-- 1. The recommended tariff
-- ---------------------------------------------------------------------------

alter table public.tariffs add column if not exists is_featured boolean not null default false;

grant insert (is_featured), update (is_featured) on public.tariffs to authenticated;

-- Marking a tariff recommended takes the mark off the one that had it, so there is never more than one.
create or replace function private.keep_one_featured_tariff()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_featured then
    update public.tariffs set is_featured = false where is_featured and id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists tariffs_one_featured on public.tariffs;
create trigger tariffs_one_featured
  before insert or update of is_featured on public.tariffs
  for each row when (new.is_featured)
  execute function private.keep_one_featured_tariff();

create unique index if not exists tariffs_one_featured_idx on public.tariffs ((true)) where is_featured;

-- ---------------------------------------------------------------------------
-- 2. The offer
-- ---------------------------------------------------------------------------

alter table public.platform_settings
  add column if not exists trial_days integer not null default 14 check (trial_days between 0 and 90),
  add column if not exists money_back_days integer not null default 30 check (money_back_days between 0 and 90),
  add column if not exists referral_enabled boolean not null default true;

grant update (trial_days, money_back_days, referral_enabled) on public.platform_settings to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Who recommended the platform
-- ---------------------------------------------------------------------------

alter table public.teacher_applications
  add column if not exists referrer_username text not null default ''
    check (length(referrer_username) <= 40);

drop function if exists public.submit_teacher_application(text, text, integer, text, text, text, text, uuid, text);

-- The landing page's form. Returns nothing: a guest learns only that it went through. The referrer is
-- kept as typed: a guest must not learn which logins exist, so the admin matches it to a teacher.
create or replace function public.submit_teacher_application(
  p_full_name text,
  p_phone text,
  p_students_count integer default null,
  p_telegram_username text default '',
  p_city text default '',
  p_center_name text default '',
  p_heard_from text default '',
  p_tariff_id uuid default null,
  p_note text default '',
  p_referrer_username text default ''
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
    full_name, phone, students_count, telegram_username, city, center_name, heard_from, tariff_id, note,
    referrer_username
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
    left(trim(coalesce(p_note, '')), 1000),
    left(lower(ltrim(trim(coalesce(p_referrer_username, '')), '@')), 40)
  );
end;
$$;

revoke execute on function
  public.submit_teacher_application(text, text, integer, text, text, text, text, uuid, text, text)
from public;
grant execute on function
  public.submit_teacher_application(text, text, integer, text, text, text, text, uuid, text, text)
to anon, authenticated, service_role;

-- Every admin hears about a new application at once, with who recommended it.
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
    case when new.heard_from <> '' then E'\n🔎 ' || private.html_escape(new.heard_from) else '' end ||
    case when new.referrer_username <> '' then E'\n🤝 Tavsiya: @' || private.html_escape(new.referrer_username) else '' end;

  for v_admin in select id from public.profiles where role = 'admin' loop
    perform private.send_telegram(v_admin, v_text);
  end loop;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Real numbers for the landing page
-- ---------------------------------------------------------------------------

-- Counts only: no name, no login, no teacher can be told apart from them.
create or replace function public.platform_public_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'teachers', (select count(*) from public.teachers where disabled_at is null),
    'students', (select count(*) from public.profiles where role = 'student'),
    'correctAnswers', (select coalesce(sum(correct), 0) from public.practice_results)
  );
$$;

revoke execute on function public.platform_public_stats() from public;
grant execute on function public.platform_public_stats() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. A morning reminder about unanswered applications
-- ---------------------------------------------------------------------------

-- Days the digest went out, so it goes once a day however often the job runs.
create table if not exists private.application_reminders (
  for_date date primary key,
  sent_at timestamptz not null default now()
);

-- One message to every admin listing applications still "new" after a day. True when it went out now.
create or replace function private.send_application_reminders(p_now timestamptz default now())
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_lines text;
  v_admin uuid;
begin
  select count(*) into v_count
  from public.teacher_applications
  where status = 'new' and created_at <= p_now - interval '1 day';

  if v_count = 0 then
    return false;
  end if;

  insert into private.application_reminders (for_date)
  values ((p_now at time zone 'Asia/Tashkent')::date)
  on conflict do nothing;
  if not found then
    return false;
  end if;

  select string_agg(
    '• ' || private.html_escape(a.full_name) || ' — ' || private.html_escape(a.phone) ||
      ' (' || floor(extract(epoch from (p_now - a.created_at)) / 86400)::int || ' kun)',
    E'\n' order by a.created_at
  ) into v_lines
  from (
    select full_name, phone, created_at from public.teacher_applications
    where status = 'new' and created_at <= p_now - interval '1 day'
    order by created_at
    limit 5
  ) a;

  for v_admin in select id from public.profiles where role = 'admin' loop
    perform private.send_telegram(
      v_admin,
      '⏰ <b>' || v_count || ' ta ariza javobsiz turibdi</b>' || E'\n' || v_lines ||
        case when v_count > 5 then E'\n… va yana ' || (v_count - 5) || ' ta' else '' end
    );
  end loop;
  return true;
end;
$$;

revoke execute on function private.send_application_reminders(timestamptz) from public, anon, authenticated;
grant execute on function private.send_application_reminders(timestamptz) to service_role;

-- Every morning at 10:00 Tashkent, when someone can call back. Guarded: the tests have no pg_cron.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('application-reminders', '0 5 * * *', 'select private.send_application_reminders()');
  end if;
end $$;
