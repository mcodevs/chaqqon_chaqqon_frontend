-- Chaqqon-chaqqon: allow multiple active competition rooms.
-- Removes the single-active-room constraint so the teacher can run multiple rooms at the same time.

drop index if exists public.rooms_single_active;

-- Index to quickly query active and recent rooms
create index if not exists rooms_status_created_at_idx on public.rooms (status, created_at desc);
