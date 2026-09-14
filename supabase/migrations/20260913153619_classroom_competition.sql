-- Classroom competitions: the teacher runs a split-screen match on one device and records
-- a result for every participant. Each result now states how it was produced.

alter table public.practice_results
  add column mode text not null default 'practice'
  constraint practice_results_mode_check check (mode in ('practice', 'online', 'classroom'));

update public.practice_results set mode = 'online' where room_id is not null;

alter table public.practice_results
  add constraint practice_results_room_matches_mode check ((mode = 'online') = (room_id is not null));

-- A single INSERT policy: the advisors flag overlapping permissive policies.
drop policy "Students record their own results" on public.practice_results;

create policy "Students record their results; the teacher records classroom matches"
  on public.practice_results for insert to authenticated
  with check (
    (
      student_id = (select auth.uid())
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
