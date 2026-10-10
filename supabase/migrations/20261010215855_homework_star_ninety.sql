-- A homework answered at least 90% right is worth one star (it used to take 100%).
-- Only new results are affected: stars already in the ledger stay as they are.
create or replace function private.award_homework_star()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.mode = 'online' and new.total > 0 and new.correct * 10 >= new.total * 9 then
    insert into public.star_awards (student_id, delta, reason, source_result_id)
    values (new.student_id, 1, 'homework', new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
