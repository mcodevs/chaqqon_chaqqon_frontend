-- Chaqqon-chaqqon: Telegram Bot & Mini App Integration.

-- ---------------------------------------------------------------------------
-- Columns on public.profiles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists telegram_user_id bigint unique,
  add column if not exists telegram_chat_id bigint,
  add column if not exists telegram_username text,
  add column if not exists telegram_first_name text;

create index if not exists profiles_telegram_user_id_idx on public.profiles (telegram_user_id)
  where telegram_user_id is not null;

-- Grant select on the new telegram columns to authenticated users
grant select (telegram_user_id, telegram_username) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Allows an authenticated user to bind their own profile to their Telegram account.
create or replace function public.link_telegram_account(
  p_telegram_user_id bigint,
  p_telegram_chat_id bigint,
  p_telegram_username text default null,
  p_telegram_first_name text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := (select auth.uid());
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_telegram_user_id is null or p_telegram_chat_id is null then
    raise exception 'INVALID_TELEGRAM_DATA';
  end if;

  -- Ensure this Telegram account is not already bound to another profile
  if exists (
    select 1 from public.profiles
    where telegram_user_id = p_telegram_user_id and id <> v_user_id
  ) then
    raise exception 'TELEGRAM_ACCOUNT_ALREADY_LINKED';
  end if;

  update public.profiles
  set
    telegram_user_id = p_telegram_user_id,
    telegram_chat_id = p_telegram_chat_id,
    telegram_username = nullif(trim(p_telegram_username), ''),
    telegram_first_name = coalesce(p_telegram_first_name, '')
  where id = v_user_id;

  return true;
end;
$$;

-- Allows an authenticated user to unlink their Telegram account.
create or replace function public.unlink_telegram_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := (select auth.uid());
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  update public.profiles
  set
    telegram_user_id = null,
    telegram_chat_id = null,
    telegram_username = null,
    telegram_first_name = null
  where id = v_user_id;

  return true;
end;
$$;

revoke execute on function public.link_telegram_account(bigint, bigint, text, text) from public, anon;
revoke execute on function public.unlink_telegram_account() from public, anon;

grant execute on function public.link_telegram_account(bigint, bigint, text, text) to authenticated, service_role;
grant execute on function public.unlink_telegram_account() to authenticated, service_role;
