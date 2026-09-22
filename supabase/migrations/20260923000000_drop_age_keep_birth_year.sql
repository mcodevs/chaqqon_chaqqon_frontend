-- Migration: 20260923000000_drop_age_keep_birth_year.sql
-- Birth year replaces age as the single source of truth, so the roster's year filter has something
-- to group by and the displayed age stays correct as the years pass.
--
-- Students added before `birth_year` existed only carry `age`. Their birth year is derived from it,
-- which ignores the birthday itself and so may be one year off; the teacher can correct it in the
-- edit form. Then the `age` column goes away for good.

update public.profiles
set birth_year = extract(year from private.school_today())::smallint - age
where role = 'student'
  and birth_year is null
  and age is not null;

alter table public.profiles drop column if exists age;

-- student_accounts() and update_student_profile() both named the column, so both are rebuilt.
drop function if exists public.student_accounts();

create function public.student_accounts()
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
  where p.role = 'student' and (select private.is_teacher())
  order by p.created_at;
$$;

revoke execute on function public.student_accounts() from public, anon;
grant execute on function public.student_accounts() to authenticated, service_role;

drop function if exists public.update_student_profile(uuid, text, text, smallint, smallint, text);

create function public.update_student_profile(
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
  if not (select private.is_teacher()) then
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

grant execute on function public.update_student_profile(uuid, text, text, smallint, text) to authenticated;

-- Dropping the column takes its grants with it; the remaining editable columns are re-granted.
grant update (first_name, last_name, birth_year, level_group) on public.profiles to authenticated;
