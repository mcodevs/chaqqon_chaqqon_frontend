-- Nicer HTML-formatted Telegram notifications, and a new one: tell the teacher
-- when a student finishes an interactive homework (an online room).

-- Escape dynamic values so a gift title or a name can never break the HTML markup.
create or replace function private.html_escape(p text)
returns text
language sql
immutable
set search_path = ''
as $fn$
  select replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
$fn$;

-- 1. Written homework recorded / status changed.
create or replace function private.on_written_homework_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
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
    '📝 <b>Yozma uy vazifasi</b>' || E'\n' ||
    '🗓 ' || new.date::text || E'\n' ||
    'Holat: ' || v_label
  );
  return new;
end;
$fn$;

-- 2. Interactive homework (online room) created.
create or replace function private.on_room_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_student uuid;
begin
  foreach v_student in array new.participant_ids loop
    perform private.notify_telegram(
      v_student,
      '🧮 <b>Yangi interaktiv uy vazifasi</b>' || E'\n' ||
      'Ilovaga kirib bajaring 👇'
    );
  end loop;
  return new;
end;
$fn$;

-- 3. Market order placed -> buyer + teacher.
create or replace function private.on_market_order_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_teacher uuid;
begin
  perform private.notify_telegram(
    new.student_id,
    '🎁 <b>Xarid qilindi</b>' || E'\n' ||
    private.html_escape(new.item_title) || ' — ' || new.cost_stars || ' ⭐' || E'\n' ||
    'Ustoz tez orada topshiradi.'
  );

  select id into v_teacher from public.profiles where role = 'teacher' limit 1;
  if v_teacher is not null then
    perform private.notify_telegram(
      v_teacher,
      '🛒 <b>Yangi buyurtma</b>' || E'\n' ||
      '<b>' || private.html_escape(private.display_name(new.student_id)) || '</b>: ' ||
      private.html_escape(new.item_title) || ' — ' || new.cost_stars || ' ⭐'
    );
  end if;
  return new;
end;
$fn$;

-- 4. Order delivered -> buyer.
create or replace function private.on_market_order_delivered()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform private.notify_telegram(
    new.student_id,
    '✅ <b>Sovgʻa topshirildi</b>' || E'\n' ||
    private.html_escape(new.item_title) || E'\n' ||
    'Tabriklaymiz! 🎉'
  );
  return new;
end;
$fn$;

-- 5. NEW: a student finished an interactive homework -> notify the teacher.
create function private.on_room_progress_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_teacher uuid;
begin
  select id into v_teacher from public.profiles where role = 'teacher' limit 1;
  if v_teacher is not null then
    perform private.notify_telegram(
      v_teacher,
      '🎯 <b>' || private.html_escape(private.display_name(new.student_id)) || '</b> interaktiv uy vazifasini tugatdi' || E'\n' ||
      'Natija: ' || new.correct || '/' || new.total || ' toʻgʻri'
    );
  end if;
  return new;
end;
$fn$;

create trigger room_progress_finished_insert_notify
  after insert on public.room_progress
  for each row when (new.finished)
  execute function private.on_room_progress_finished();

create trigger room_progress_finished_update_notify
  after update of finished on public.room_progress
  for each row when (old.finished is distinct from new.finished and new.finished)
  execute function private.on_room_progress_finished();
