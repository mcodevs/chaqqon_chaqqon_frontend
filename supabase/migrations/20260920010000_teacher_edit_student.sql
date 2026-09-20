-- Migration: 20260920010000_teacher_edit_student.sql
-- Allow teacher to update student profile fields: first_name, last_name, age, birth_year, level_group

grant update (first_name, last_name, age, birth_year, level_group) on public.profiles to authenticated;

create or replace function public.update_student_profile(
  student_id uuid,
  first_name text default null,
  last_name text default null,
  age smallint default null,
  birth_year smallint default null,
  level_group text default null
)
returns void
language plpgsql
security definer
as $$
begin
  if not (select private.is_teacher()) then
    raise exception 'Unauthorized';
  end if;

  update public.profiles
  set
    first_name = coalesce(update_student_profile.first_name, profiles.first_name),
    last_name = coalesce(update_student_profile.last_name, profiles.last_name),
    age = coalesce(update_student_profile.age, profiles.age),
    birth_year = update_student_profile.birth_year,
    level_group = coalesce(update_student_profile.level_group, profiles.level_group)
  where id = student_id and role = 'student';
end;
$$;

grant execute on function public.update_student_profile(uuid, text, text, smallint, smallint, text) to authenticated;
