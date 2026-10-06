-- Chaqqon-chaqqon: stars become a ledger.
--
-- Until now a star balance was recomputed from the whole result history every time it was read,
-- so every change to the rule silently rewrote what the children had already earned. From here a
-- star is a row: it says who got it, how much, what for, and what it came from. The ledger starts
-- empty on purpose — the teacher asked to start the count over, and no stars had been spent yet.
--
-- Nothing in the app writes this table. Both triggers below are SECURITY DEFINER and are the only
-- way a row appears, so a student cannot award themselves a star by calling the API.

create table if not exists public.star_awards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  -- Positive for a star earned, negative for one spent. Zero would say nothing.
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('homework', 'purchase', 'refund', 'teacher_grant')),
  source_result_id uuid references public.practice_results (id) on delete cascade,
  source_order_id uuid references public.market_orders (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists star_awards_student_id_idx on public.star_awards (student_id);

-- One homework pays once, however many times its result reaches the table.
create unique index if not exists star_awards_result_idx
  on public.star_awards (source_result_id)
  where source_result_id is not null;

-- An order is charged once and refunded at most once.
create unique index if not exists star_awards_order_reason_idx
  on public.star_awards (source_order_id, reason)
  where source_order_id is not null;

-- Applying this file twice must not fail, so the publication membership is added only once.
do $$
begin
  alter publication supabase_realtime add table public.star_awards;
exception
  when duplicate_object then null;
end
$$;

-- Reading only: the writes come from the triggers, which run as the definer.
grant select on public.star_awards to authenticated;

alter table public.star_awards enable row level security;

drop policy if exists "Users read their own stars" on public.star_awards;
create policy "Users read their own stars"
  on public.star_awards for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_teacher()));

-- ---------------------------------------------------------------------------
-- A homework done without a single mistake is worth one star.
-- ---------------------------------------------------------------------------

create or replace function private.award_homework_star()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.mode = 'online' and new.total > 0 and new.correct = new.total then
    insert into public.star_awards (student_id, delta, reason, source_result_id)
    values (new.student_id, 1, 'homework', new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists practice_results_award_star on public.practice_results;
create trigger practice_results_award_star
  after insert on public.practice_results
  for each row execute function private.award_homework_star();

-- ---------------------------------------------------------------------------
-- Buying a gift spends stars; cancelling the order gives them back.
-- ---------------------------------------------------------------------------

create or replace function private.charge_order_stars()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.star_awards (student_id, delta, reason, source_order_id)
  values (new.student_id, -new.cost_stars, 'purchase', new.id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists market_orders_charge_stars on public.market_orders;
create trigger market_orders_charge_stars
  after insert on public.market_orders
  for each row execute function private.charge_order_stars();

create or replace function private.refund_order_stars()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    insert into public.star_awards (student_id, delta, reason, source_order_id)
    values (new.student_id, new.cost_stars, 'refund', new.id)
    on conflict do nothing;
  elsif old.status = 'cancelled' and new.status is distinct from 'cancelled' then
    -- The order is live again, so the refund is taken back and the purchase stands.
    delete from public.star_awards where source_order_id = new.id and reason = 'refund';
  end if;
  return new;
end;
$$;

drop trigger if exists market_orders_refund_stars on public.market_orders;
create trigger market_orders_refund_stars
  after update of status on public.market_orders
  for each row execute function private.refund_order_stars();
