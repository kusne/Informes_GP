-- PASO 37 - Supabase Storage para fotos de Informes_GP
-- Ejecutar en Supabase SQL Editor si el bucket todavía no existe.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'operativos-historial-fotos',
  'operativos-historial-fotos',
  true,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 12582912,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'];

drop policy if exists "informes_gp_fotos_select" on storage.objects;
create policy "informes_gp_fotos_select"
on storage.objects
for select
using (
  bucket_id = 'operativos-historial-fotos'
);

drop policy if exists "informes_gp_fotos_insert" on storage.objects;
create policy "informes_gp_fotos_insert"
on storage.objects
for insert
with check (
  bucket_id = 'operativos-historial-fotos'
);

drop policy if exists "informes_gp_fotos_update" on storage.objects;
create policy "informes_gp_fotos_update"
on storage.objects
for update
using (
  bucket_id = 'operativos-historial-fotos'
)
with check (
  bucket_id = 'operativos-historial-fotos'
);