-- Telegram integration: link accounts to Telegram chats and push notifications
-- on key events (homework, market). The web app keeps working without Telegram;
-- notifications are a no-op until the vault secrets below are set.

-- ---------------------------------------------------------------------------
-- Async HTTP so database triggers can call the notify Edge Function.
-- Guarded so the migration also runs in environments without pg_net (the
-- embedded Postgres used by the schema tests).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Links: one account may be reachable on several Telegram chats
-- (a child uses a parent's phone; both parents may be linked).
-- Written only by the service role (Edge Functions); each user reads only
-- their own links, and chat ids never leak to other users.
-- ---------------------------------------------------------------------------
create table public.telegram_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  chat_id bigint not null,
  created_at timestamptz not null default now(),
  constraint telegram_links_profile_chat_key unique (profile_id, chat_id)
);

create index telegram_links_profile_id_idx on public.telegram_links (profile_id);
create index telegram_links_chat_id_idx on public.telegram_links (chat_id);

revoke all on public.telegram_links from anon, authenticated;
grant select on public.telegram_links to authenticated;

alter table public.telegram_links enable row level security;

create policy "Users read their own telegram links"
  on public.telegram_links for select to authenticated
  using (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Central dispatcher. Every trigger calls this; adding a new notification is
-- just one more trigger. Reads the notify URL and shared secret from Vault so
-- no secret ever lives in git. If either is missing it silently does nothing,
-- which keeps the app fully working before Telegram is configured.
-- ---------------------------------------------------------------------------
create function private.notify_telegram(p_profile_id uuid, p_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if p_profile_id is null or coalesce(p_text, '') = '' then
    return;
  end if;

  -- Best effort: a notification must never break the write that triggered it,
  -- and must be a no-op where Vault/pg_net are absent (e.g. the schema tests).
  begin
    select decrypted_secret into v_url
      from vault.decrypted_secrets where name = 'telegram_notify_url';
    select decrypted_secret into v_secret
      from vault.decrypted_secrets where name = 'telegram_notify_secret';

    if v_url is null or v_secret is null then
      return; -- Telegram not configured yet.
    end if;

    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('profile_id', p_profile_id, 'text', p_text),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-notify-secret', v_secret
      )
    );
  exception when others then
    return; -- swallow: notifications are non-critical.
  end;
end;
$$;

revoke execute on function private.notify_telegram(uuid, text) from public, anon, authenticated;
grant execute on function private.notify_telegram(uuid, text) to service_role;

-- Small helper: a student's display name, falling back to the username.
create function private.display_name(p_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), p.username, 'O''quvchi')
  from public.profiles p where p.id = p_profile_id;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- 1. Written homework recorded or its status changed -> notify the student.
create function private.on_written_homework_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text;
begin
  v_label := case new.status
    when 'bajardi' then 'bajarildi ✅'
    when 'chala' then 'chala bajarildi ⚠️'
    else 'bajarilmadi ❌'
  end;
  perform private.notify_telegram(
    new.student_id,
    '📝 Yozma uy vazifasi (' || new.date::text || '): ' || v_label
  );
  return new;
end;
$$;

create trigger written_homework_notify
  after insert on public.written_homework
  for each row execute function private.on_written_homework_change();

create trigger written_homework_status_notify
  after update of status on public.written_homework
  for each row when (old.status is distinct from new.status)
  execute function private.on_written_homework_change();

-- 2. Interactive homework (an online room) created -> notify every participant.
create function private.on_room_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid;
begin
  foreach v_student in array new.participant_ids loop
    perform private.notify_telegram(
      v_student,
      '🧮 Sizga yangi interaktiv uy vazifasi berildi! Ilovaga kirib bajaring.'
    );
  end loop;
  return new;
end;
$$;

create trigger rooms_notify
  after insert on public.rooms
  for each row execute function private.on_room_created();

-- 3. Market order placed -> confirm to the buyer and alert the teacher.
create function private.on_market_order_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher uuid;
begin
  perform private.notify_telegram(
    new.student_id,
    '🎁 Do''kondan "' || new.item_title || '" (' || new.cost_stars || ' ⭐) sotib oldingiz. Ustoz tez orada topshiradi.'
  );

  select id into v_teacher from public.profiles where role = 'teacher' limit 1;
  if v_teacher is not null then
    perform private.notify_telegram(
      v_teacher,
      '🛒 Yangi buyurtma: ' || private.display_name(new.student_id) ||
      ' — "' || new.item_title || '" (' || new.cost_stars || ' ⭐).'
    );
  end if;
  return new;
end;
$$;

create trigger market_orders_notify
  after insert on public.market_orders
  for each row execute function private.on_market_order_created();

-- 4. Order delivered -> notify the buyer.
create function private.on_market_order_delivered()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_telegram(
    new.student_id,
    '✅ "' || new.item_title || '" sovg''angiz topshirildi. Tabriklaymiz!'
  );
  return new;
end;
$$;

create trigger market_orders_delivered_notify
  after update of status on public.market_orders
  for each row when (old.status is distinct from new.status and new.status = 'delivered')
  execute function private.on_market_order_delivered();
