-- INFORMES_GP - SQL COMPLETO V2 + STORAGE + RLS
-- Ejecutar en Supabase SQL Editor.
-- Incluye tablas, índices, bucket de fotos y políticas abiertas para app web.

create table if not exists public.operativos_programados_v2 (
  id uuid primary key default gen_random_uuid(),
  guardia_fecha date not null,
  operativo_key text not null,
  hora_inicio text,
  hora_fin text,
  hora_finalizacion text,
  franja_horaria text,
  lugar text,
  qth text,
  ubicacion text,
  tipo_operativo text default 'GENERICO',
  tipo_nombre text,
  tipo_descripcion text,
  tipo_codigo text,
  estado text default 'PROGRAMADO',
  activo boolean not null default true,
  origen text default 'Informes_GP',
  datos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operativos_programados_v2_unique_key unique (guardia_fecha, operativo_key)
);

create index if not exists idx_operativos_programados_v2_guardia_fecha
on public.operativos_programados_v2 (guardia_fecha);

create index if not exists idx_operativos_programados_v2_activo
on public.operativos_programados_v2 (activo);

create index if not exists idx_operativos_programados_v2_guardia_activo_hora
on public.operativos_programados_v2 (guardia_fecha, activo, hora_inicio, hora_fin);


create table if not exists public.operativos_estado_v2 (
  id uuid primary key default gen_random_uuid(),
  guardia_fecha date not null,
  operativo_key text not null,
  tipo_evento text not null default 'INICIO',
  estado text not null default 'EN_CURSO',
  tipo_operativo text default 'GENERICO',
  tipo_nombre text,
  hora_inicio text,
  hora_fin text,
  hora_finalizacion text,
  lugar text,
  qth text,
  ubicacion text,
  personal text,
  moviles_motos text,
  elementos text,
  actas integer not null default 0,
  personas integer not null default 0,
  vehiculos integer not null default 0,
  numerales_texto text,
  numerales_items jsonb not null default '[]'::jsonb,
  numerales_resumen text,
  observaciones text,
  texto_salida text,
  origen text default 'Informes_GP',
  datos jsonb not null default '{}'::jsonb,
  fecha_evento timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operativos_estado_v2_unique_key unique (guardia_fecha, operativo_key),
  constraint operativos_estado_v2_estado_check check (estado in ('EN_CURSO', 'FINALIZADO')),
  constraint operativos_estado_v2_tipo_evento_check check (tipo_evento in ('INICIO', 'FINALIZADO'))
);

create index if not exists idx_operativos_estado_v2_guardia_fecha
on public.operativos_estado_v2 (guardia_fecha);

create index if not exists idx_operativos_estado_v2_estado
on public.operativos_estado_v2 (estado);

create index if not exists idx_operativos_estado_v2_guardia_estado_hora
on public.operativos_estado_v2 (guardia_fecha, estado, hora_inicio, hora_fin);

create index if not exists idx_operativos_estado_v2_operativo_key
on public.operativos_estado_v2 (operativo_key);


create table if not exists public.informes_especiales_v2 (
  id uuid primary key default gen_random_uuid(),
  guardia_fecha date not null,
  operativo_key text not null,
  tipo_informe text not null,
  tipo_operativo text default 'GENERICO',
  hora_inicio text,
  hora_fin text,
  lugar text,
  datos jsonb not null default '{}'::jsonb,
  calculos jsonb not null default '{}'::jsonb,
  texto_salida text not null,
  origen text default 'Informes_GP',
  fecha_evento timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_informes_especiales_v2_guardia_fecha
on public.informes_especiales_v2 (guardia_fecha);

create index if not exists idx_informes_especiales_v2_operativo_key
on public.informes_especiales_v2 (operativo_key);

create index if not exists idx_informes_especiales_v2_tipo_informe
on public.informes_especiales_v2 (tipo_informe);

create index if not exists idx_informes_especiales_v2_guardia_operativo
on public.informes_especiales_v2 (guardia_fecha, operativo_key);


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

create index if not exists idx_control_moviles_novedades_guardia_fecha
on public.control_moviles_novedades (guardia_fecha);

create index if not exists idx_control_moviles_novedades_unidad_fecha
on public.control_moviles_novedades (unidad, fecha_evento desc);

create index if not exists idx_control_moviles_novedades_guardia_unidad
on public.control_moviles_novedades (guardia_fecha, unidad);


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


alter table public.operativos_programados_v2 enable row level security;
alter table public.operativos_estado_v2 enable row level security;
alter table public.informes_especiales_v2 enable row level security;
alter table public.control_moviles_novedades enable row level security;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.operativos_programados_v2 to anon, authenticated;
grant select, insert, update, delete on public.operativos_estado_v2 to anon, authenticated;
grant select, insert, update, delete on public.informes_especiales_v2 to anon, authenticated;
grant select, insert, update, delete on public.control_moviles_novedades to anon, authenticated;

drop policy if exists "informes_gp_programados_select" on public.operativos_programados_v2;
create policy "informes_gp_programados_select" on public.operativos_programados_v2 for select to anon, authenticated using (true);

drop policy if exists "informes_gp_programados_insert" on public.operativos_programados_v2;
create policy "informes_gp_programados_insert" on public.operativos_programados_v2 for insert to anon, authenticated with check (true);

drop policy if exists "informes_gp_programados_update" on public.operativos_programados_v2;
create policy "informes_gp_programados_update" on public.operativos_programados_v2 for update to anon, authenticated using (true) with check (true);

drop policy if exists "informes_gp_programados_delete" on public.operativos_programados_v2;
create policy "informes_gp_programados_delete" on public.operativos_programados_v2 for delete to anon, authenticated using (true);


drop policy if exists "informes_gp_estado_select" on public.operativos_estado_v2;
create policy "informes_gp_estado_select" on public.operativos_estado_v2 for select to anon, authenticated using (true);

drop policy if exists "informes_gp_estado_insert" on public.operativos_estado_v2;
create policy "informes_gp_estado_insert" on public.operativos_estado_v2 for insert to anon, authenticated with check (true);

drop policy if exists "informes_gp_estado_update" on public.operativos_estado_v2;
create policy "informes_gp_estado_update" on public.operativos_estado_v2 for update to anon, authenticated using (true) with check (true);

drop policy if exists "informes_gp_estado_delete" on public.operativos_estado_v2;
create policy "informes_gp_estado_delete" on public.operativos_estado_v2 for delete to anon, authenticated using (true);


drop policy if exists "informes_gp_especiales_select" on public.informes_especiales_v2;
create policy "informes_gp_especiales_select" on public.informes_especiales_v2 for select to anon, authenticated using (true);

drop policy if exists "informes_gp_especiales_insert" on public.informes_especiales_v2;
create policy "informes_gp_especiales_insert" on public.informes_especiales_v2 for insert to anon, authenticated with check (true);

drop policy if exists "informes_gp_especiales_update" on public.informes_especiales_v2;
create policy "informes_gp_especiales_update" on public.informes_especiales_v2 for update to anon, authenticated using (true) with check (true);

drop policy if exists "informes_gp_especiales_delete" on public.informes_especiales_v2;
create policy "informes_gp_especiales_delete" on public.informes_especiales_v2 for delete to anon, authenticated using (true);


drop policy if exists "informes_gp_control_moviles_select" on public.control_moviles_novedades;
create policy "informes_gp_control_moviles_select" on public.control_moviles_novedades for select to anon, authenticated using (true);

drop policy if exists "informes_gp_control_moviles_insert" on public.control_moviles_novedades;
create policy "informes_gp_control_moviles_insert" on public.control_moviles_novedades for insert to anon, authenticated with check (true);

drop policy if exists "informes_gp_control_moviles_update" on public.control_moviles_novedades;
create policy "informes_gp_control_moviles_update" on public.control_moviles_novedades for update to anon, authenticated using (true) with check (true);

drop policy if exists "informes_gp_control_moviles_delete" on public.control_moviles_novedades;
create policy "informes_gp_control_moviles_delete" on public.control_moviles_novedades for delete to anon, authenticated using (true);


grant all on storage.objects to anon, authenticated;
grant all on storage.buckets to anon, authenticated;

drop policy if exists "informes_gp_fotos_select" on storage.objects;
create policy "informes_gp_fotos_select" on storage.objects for select to anon, authenticated using (bucket_id = 'operativos-historial-fotos');

drop policy if exists "informes_gp_fotos_insert" on storage.objects;
create policy "informes_gp_fotos_insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'operativos-historial-fotos');

drop policy if exists "informes_gp_fotos_update" on storage.objects;
create policy "informes_gp_fotos_update" on storage.objects for update to anon, authenticated using (bucket_id = 'operativos-historial-fotos') with check (bucket_id = 'operativos-historial-fotos');

drop policy if exists "informes_gp_fotos_delete" on storage.objects;
create policy "informes_gp_fotos_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'operativos-historial-fotos');
-- PASO 41 - SUPABASE REALTIME PARA INFORMES_GP

alter table if exists public.operativos_programados_v2 replica identity full;
alter table if exists public.operativos_estado_v2 replica identity full;
alter table if exists public.informes_especiales_v2 replica identity full;
alter table if exists public.control_moviles_novedades replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'operativos_programados_v2'
  ) then
    alter publication supabase_realtime add table public.operativos_programados_v2;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'operativos_estado_v2'
  ) then
    alter publication supabase_realtime add table public.operativos_estado_v2;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'informes_especiales_v2'
  ) then
    alter publication supabase_realtime add table public.informes_especiales_v2;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'control_moviles_novedades'
  ) then
    alter publication supabase_realtime add table public.control_moviles_novedades;
  end if;
end $$;
