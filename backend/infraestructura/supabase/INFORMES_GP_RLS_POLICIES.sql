-- PASO 40 - RLS / POLICIES PARA INFORMES_GP
-- Ejecutar en Supabase SQL Editor.
-- Estas políticas son abiertas para uso por app web con anon key.
-- Si después querés endurecer seguridad por usuario/rol, se ajusta en otro paso.

alter table if exists public.operativos_programados_v2 enable row level security;
alter table if exists public.operativos_estado_v2 enable row level security;
alter table if exists public.informes_especiales_v2 enable row level security;
alter table if exists public.control_moviles_novedades enable row level security;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.operativos_programados_v2 to anon, authenticated;
grant select, insert, update, delete on public.operativos_estado_v2 to anon, authenticated;
grant select, insert, update, delete on public.informes_especiales_v2 to anon, authenticated;
grant select, insert, update, delete on public.control_moviles_novedades to anon, authenticated;

drop policy if exists "informes_gp_programados_select" on public.operativos_programados_v2;
create policy "informes_gp_programados_select"
on public.operativos_programados_v2
for select
to anon, authenticated
using (true);

drop policy if exists "informes_gp_programados_insert" on public.operativos_programados_v2;
create policy "informes_gp_programados_insert"
on public.operativos_programados_v2
for insert
to anon, authenticated
with check (true);

drop policy if exists "informes_gp_programados_update" on public.operativos_programados_v2;
create policy "informes_gp_programados_update"
on public.operativos_programados_v2
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "informes_gp_programados_delete" on public.operativos_programados_v2;
create policy "informes_gp_programados_delete"
on public.operativos_programados_v2
for delete
to anon, authenticated
using (true);


drop policy if exists "informes_gp_estado_select" on public.operativos_estado_v2;
create policy "informes_gp_estado_select"
on public.operativos_estado_v2
for select
to anon, authenticated
using (true);

drop policy if exists "informes_gp_estado_insert" on public.operativos_estado_v2;
create policy "informes_gp_estado_insert"
on public.operativos_estado_v2
for insert
to anon, authenticated
with check (true);

drop policy if exists "informes_gp_estado_update" on public.operativos_estado_v2;
create policy "informes_gp_estado_update"
on public.operativos_estado_v2
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "informes_gp_estado_delete" on public.operativos_estado_v2;
create policy "informes_gp_estado_delete"
on public.operativos_estado_v2
for delete
to anon, authenticated
using (true);


drop policy if exists "informes_gp_especiales_select" on public.informes_especiales_v2;
create policy "informes_gp_especiales_select"
on public.informes_especiales_v2
for select
to anon, authenticated
using (true);

drop policy if exists "informes_gp_especiales_insert" on public.informes_especiales_v2;
create policy "informes_gp_especiales_insert"
on public.informes_especiales_v2
for insert
to anon, authenticated
with check (true);

drop policy if exists "informes_gp_especiales_update" on public.informes_especiales_v2;
create policy "informes_gp_especiales_update"
on public.informes_especiales_v2
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "informes_gp_especiales_delete" on public.informes_especiales_v2;
create policy "informes_gp_especiales_delete"
on public.informes_especiales_v2
for delete
to anon, authenticated
using (true);


drop policy if exists "informes_gp_control_moviles_select" on public.control_moviles_novedades;
create policy "informes_gp_control_moviles_select"
on public.control_moviles_novedades
for select
to anon, authenticated
using (true);

drop policy if exists "informes_gp_control_moviles_insert" on public.control_moviles_novedades;
create policy "informes_gp_control_moviles_insert"
on public.control_moviles_novedades
for insert
to anon, authenticated
with check (true);

drop policy if exists "informes_gp_control_moviles_update" on public.control_moviles_novedades;
create policy "informes_gp_control_moviles_update"
on public.control_moviles_novedades
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "informes_gp_control_moviles_delete" on public.control_moviles_novedades;
create policy "informes_gp_control_moviles_delete"
on public.control_moviles_novedades
for delete
to anon, authenticated
using (true);


-- STORAGE
grant all on storage.objects to anon, authenticated;
grant all on storage.buckets to anon, authenticated;

drop policy if exists "informes_gp_fotos_select" on storage.objects;
create policy "informes_gp_fotos_select"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'operativos-historial-fotos'
);

drop policy if exists "informes_gp_fotos_insert" on storage.objects;
create policy "informes_gp_fotos_insert"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'operativos-historial-fotos'
);

drop policy if exists "informes_gp_fotos_update" on storage.objects;
create policy "informes_gp_fotos_update"
on storage.objects
for update
to anon, authenticated
using (
  bucket_id = 'operativos-historial-fotos'
)
with check (
  bucket_id = 'operativos-historial-fotos'
);

drop policy if exists "informes_gp_fotos_delete" on storage.objects;
create policy "informes_gp_fotos_delete"
on storage.objects
for delete
to anon, authenticated
using (
  bucket_id = 'operativos-historial-fotos'
);