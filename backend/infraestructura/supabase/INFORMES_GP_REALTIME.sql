-- PASO 41 - SUPABASE REALTIME PARA INFORMES_GP
-- Ejecutar en Supabase SQL Editor.
-- Habilita cambios realtime para las tablas usadas por la app.

alter table if exists public.operativos_programados_v2 replica identity full;
alter table if exists public.operativos_estado_v2 replica identity full;
alter table if exists public.informes_especiales_v2 replica identity full;
alter table if exists public.control_moviles_novedades replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'operativos_programados_v2'
  ) then
    alter publication supabase_realtime add table public.operativos_programados_v2;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'operativos_estado_v2'
  ) then
    alter publication supabase_realtime add table public.operativos_estado_v2;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'informes_especiales_v2'
  ) then
    alter publication supabase_realtime add table public.informes_especiales_v2;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'control_moviles_novedades'
  ) then
    alter publication supabase_realtime add table public.control_moviles_novedades;
  end if;
end $$;