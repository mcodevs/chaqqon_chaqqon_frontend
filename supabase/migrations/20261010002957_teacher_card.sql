-- What a student shows of their teacher: the name on a shared result picture and the header of the
-- app, and the centre when there is one. A student cannot read their teacher's profile row, so this
-- hands over just these fields. A teacher gets their own; anyone else gets nothing.

create or replace function public.my_teacher_card()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'firstName', p.first_name,
    'lastName', p.last_name,
    'centerName', coalesce(t.center_name, ''),
    'phone', coalesce(t.phone, '')
  )
  from public.profiles p
  left join public.teachers t on t.profile_id = p.id
  where p.id = private.my_teacher_id() and p.role = 'teacher';
$$;

revoke execute on function public.my_teacher_card() from public, anon;
grant execute on function public.my_teacher_card() to authenticated, service_role;
