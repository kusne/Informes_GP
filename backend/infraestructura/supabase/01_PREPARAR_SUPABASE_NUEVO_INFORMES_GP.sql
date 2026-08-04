-- ============================================================
-- INFORMES_GP - PREPARAR SUPABASE NUEVO PARA APP WEB
-- Proyecto: hbnxvwrqxhurdteirsyl
--
-- NO modifica bmzcn_operativos_programados_v2.
-- Esa tabla sigue siendo propiedad de Filtro Ordenes.
--
-- Este script prepara la persistencia de INICIA / FINALIZA,
-- Control de Moviles y el bucket de fotos que usa Informes_GP.
-- Es seguro ejecutarlo mas de una vez.
-- ============================================================

create extension if not exists pgcrypto;

grant usage on schema public to anon, authenticated;

-- ============================================================
-- 1) ESTADO DE OPERATIVOS - INICIA / FINALIZA
-- ============================================================

create table if not exists public.bmzcn_operativos_estado_v2 (
  id uuid primary key default gen_random_uuid()
);

alter table public.bmzcn_operativos_estado_v2
  add column if not exists guardia_fecha date,
  add column if not exists operativo_key text,
  add column if not exists tipo_evento text default 'INICIO',
  add column if not exists estado text default 'EN_CURSO',
  add column if not exists tipo_operativo text default 'GENERICO',
  add column if not exists tipo_nombre text,
  add column if not exists hora_inicio text,
  add column if not exists hora_fin text,
  add column if not exists hora_finalizacion text,
  add column if not exists lugar text,
  add column if not exists qth text,
  add column if not exists ubicacion text,
  add column if not exists personal text,
  add column if not exists moviles_motos text,
  add column if not exists elementos text,
  add column if not exists actas integer default 0,
  add column if not exists personas integer default 0,
  add column if not exists vehiculos integer default 0,
  add column if not exists numerales_texto text,
  add column if not exists numerales_items jsonb default '[]'::jsonb,
  add column if not exists numerales_resumen text,
  add column if not exists observaciones text,
  add column if not exists texto_salida text,
  add column if not exists origen text default 'Informes_GP',
  add column if not exists datos jsonb default '{}'::jsonb,
  add column if not exists fecha_evento timestamptz default now(),
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Defaults para filas nuevas, sin forzar NOT NULL sobre datos historicos.
alter table public.bmzcn_operativos_estado_v2
  alter column actas set default 0,
  alter column personas set default 0,
  alter column vehiculos set default 0,
  alter column numerales_items set default '[]'::jsonb,
  alter column datos set default '{}'::jsonb,
  alter column fecha_evento set default now(),
  alter column created_at set default now(),
  alter column updated_at set default now();

create index if not exists idx_bmzcn_operativos_estado_v2_guardia
  on public.bmzcn_operativos_estado_v2 (guardia_fecha);

create index if not exists idx_bmzcn_operativos_estado_v2_estado
  on public.bmzcn_operativos_estado_v2 (estado);

create index if not exists idx_bmzcn_operativos_estado_v2_key
  on public.bmzcn_operativos_estado_v2 (operativo_key);

create index if not exists idx_bmzcn_operativos_estado_v2_guardia_key
  on public.bmzcn_operativos_estado_v2 (guardia_fecha, operativo_key);

alter table public.bmzcn_operativos_estado_v2 enable row level security;

grant select, insert, update, delete
  on table public.bmzcn_operativos_estado_v2
  to anon, authenticated;

drop policy if exists "informes_gp_estado_select" on public.bmzcn_operativos_estado_v2;
create policy "informes_gp_estado_select"
  on public.bmzcn_operativos_estado_v2
  for select
  to anon, authenticated
  using (true);

drop policy if exists "informes_gp_estado_insert" on public.bmzcn_operativos_estado_v2;
create policy "informes_gp_estado_insert"
  on public.bmzcn_operativos_estado_v2
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "informes_gp_estado_update" on public.bmzcn_operativos_estado_v2;
create policy "informes_gp_estado_update"
  on public.bmzcn_operativos_estado_v2
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "informes_gp_estado_delete" on public.bmzcn_operativos_estado_v2;
create policy "informes_gp_estado_delete"
  on public.bmzcn_operativos_estado_v2
  for delete
  to anon, authenticated
  using (true);

-- ============================================================
-- 2) CONTROL DE MOVILES
-- ============================================================

create table if not exists public.control_moviles_novedades (
  id uuid primary key default gen_random_uuid(),
  guardia_fecha date,
  fecha_evento timestamptz not null default now(),
  unidad text not null,
  estado text not null,
  kilometraje integer default 0,
  combustible text,
  chofer text,
  observaciones text,
  texto_salida text,
  origen text default 'Informes_GP',
  created_at timestamptz not null default now()
);

create index if not exists idx_control_moviles_novedades_guardia
  on public.control_moviles_novedades (guardia_fecha);

create index if not exists idx_control_moviles_novedades_fecha
  on public.control_moviles_novedades (fecha_evento desc);

alter table public.control_moviles_novedades enable row level security;

grant select, insert, update, delete
  on table public.control_moviles_novedades
  to anon, authenticated;

drop policy if exists "informes_gp_control_select" on public.control_moviles_novedades;
create policy "informes_gp_control_select"
  on public.control_moviles_novedades
  for select
  to anon, authenticated
  using (true);

drop policy if exists "informes_gp_control_insert" on public.control_moviles_novedades;
create policy "informes_gp_control_insert"
  on public.control_moviles_novedades
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "informes_gp_control_update" on public.control_moviles_novedades;
create policy "informes_gp_control_update"
  on public.control_moviles_novedades
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "informes_gp_control_delete" on public.control_moviles_novedades;
create policy "informes_gp_control_delete"
  on public.control_moviles_novedades
  for delete
  to anon, authenticated
  using (true);

-- ============================================================
-- 3) STORAGE DE FOTOS
-- ============================================================

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
  to anon, authenticated
  using (bucket_id = 'operativos-historial-fotos');

drop policy if exists "informes_gp_fotos_insert" on storage.objects;
create policy "informes_gp_fotos_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'operativos-historial-fotos');

drop policy if exists "informes_gp_fotos_update" on storage.objects;
create policy "informes_gp_fotos_update"
  on storage.objects
  for update
  to anon, authenticated
  using (bucket_id = 'operativos-historial-fotos')
  with check (bucket_id = 'operativos-historial-fotos');

-- Fuerza a PostgREST a refrescar el esquema inmediatamente.
notify pgrst, 'reload schema';
