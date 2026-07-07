-- Tribeca Aula v197 · Supabase Storage para recursos completos con carpeta de assets
-- Crea un bucket público para que los juegos, presentaciones HTML y recursos con assets
-- puedan subirse desde el panel de publicaciones y visualizarse dentro del aula.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tribeca-public-assets', 'tribeca-public-assets', true, 52428800, null)
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = null;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'tribeca_public_assets_read_v197'
  ) then
    create policy tribeca_public_assets_read_v197
      on storage.objects
      for select
      using (bucket_id = 'tribeca-public-assets');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'tribeca_public_assets_insert_v197'
  ) then
    create policy tribeca_public_assets_insert_v197
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'tribeca-public-assets');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'tribeca_public_assets_update_v197'
  ) then
    create policy tribeca_public_assets_update_v197
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'tribeca-public-assets')
      with check (bucket_id = 'tribeca-public-assets');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'tribeca_public_assets_delete_v197'
  ) then
    create policy tribeca_public_assets_delete_v197
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'tribeca-public-assets');
  end if;
end $$;

commit;
