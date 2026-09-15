-- Chaqqon-chaqqon: Market and stars rewards system.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.market_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  cost_stars integer not null check (cost_stars > 0),
  image_url text not null,
  stock integer check (stock is null or stock >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.market_orders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.market_items (id) on delete cascade,
  item_title text not null,
  cost_stars integer not null check (cost_stars > 0),
  status text not null check (status in ('pending', 'delivered', 'cancelled')) default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists market_orders_student_id_idx on public.market_orders (student_id);

-- Realtime
alter publication supabase_realtime add table public.market_items;
alter publication supabase_realtime add table public.market_orders;

-- Permissions
grant select on public.market_items to authenticated;
grant insert, update, delete on public.market_items to authenticated;

grant select, insert on public.market_orders to authenticated;
grant update on public.market_orders to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.market_items enable row level security;
alter table public.market_orders enable row level security;

-- Everyone authenticated can browse items
create policy "Authenticated users read market items"
  on public.market_items for select to authenticated
  using (true);

-- Only the teacher manages market items
create policy "Teacher manages market items"
  on public.market_items for all to authenticated
  using ((select private.is_teacher()))
  with check ((select private.is_teacher()));

-- Students read their own orders; teacher reads all
create policy "Users read orders"
  on public.market_orders for select to authenticated
  using (
    student_id = (select auth.uid()) or (select private.is_teacher())
  );

-- Students create their own orders
create policy "Students place orders"
  on public.market_orders for insert to authenticated
  with check (
    student_id = (select auth.uid())
  );

-- Teacher updates orders (marks delivered or cancelled)
create policy "Teacher updates orders"
  on public.market_orders for update to authenticated
  using ((select private.is_teacher()))
  with check ((select private.is_teacher()));
