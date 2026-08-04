-- ============================================================
-- INFORMES_GP - REALTIME EN EL PROYECTO NUEVO
-- Ejecutar una sola vez en SQL Editor del proyecto nuevo.
-- Seguro de volver a ejecutar.
-- ============================================================

alter table if exists public.bmzcn_operativos_programados_v2 replica identity full;
alter table if exists public.bmzcn_operativos_estado_v2 replica identity full;
alter table if exists public.bmzcn_informes_intradiarios_v2 replica identity full;
alter table if exists public.bmzcn_informes_intradiarios_items_v2 replica identity full;
alter table if exists public.control_moviles_novedades replica identity full;

do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'bmzcn_operativos_programados_v2',
    'bmzcn_operativos_estado_v2',
    'bmzcn_informes_intradiarios_v2',
    'bmzcn_informes_intradiarios_items_v2',
    'control_moviles_novedades'
  ]
  loop
    if to_regclass('public.' || tabla) is not null
       and not exists (
         select 1
         from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = tabla
       ) then
      execute format('alter publication supabase_realtime add table public.%I', tabla);
    end if;
  end loop;
end $$;
