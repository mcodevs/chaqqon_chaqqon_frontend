-- Migration: 20260923010000_market_image_bucket.sql
-- A shop item can now carry a photo of the real gift, not only an emoji. Anyone signed in reads
-- the pictures (students browse the shop); only the teacher, who owns the shop, uploads them.

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('market', 'market', true)
    on conflict (id) do nothing;

    if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
      if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public market image access') then
        execute 'create policy "Public market image access" on storage.objects for select to authenticated, anon using (bucket_id = ''market'')';
      end if;
      if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Teacher uploads market images') then
        execute 'create policy "Teacher uploads market images" on storage.objects for insert to authenticated with check (bucket_id = ''market'' and (select private.is_teacher()))';
      end if;
      if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Teacher updates market images') then
        execute 'create policy "Teacher updates market images" on storage.objects for update to authenticated using (bucket_id = ''market'' and (select private.is_teacher()))';
      end if;
      if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Teacher deletes market images') then
        execute 'create policy "Teacher deletes market images" on storage.objects for delete to authenticated using (bucket_id = ''market'' and (select private.is_teacher()))';
      end if;
    end if;
  end if;
end $$;
