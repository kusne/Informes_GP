-- ============================================================
-- BMZCN V2 - INFORMES INTRADIARIOS GENERADOS POR INFORMES_GP
-- Tablas canónicas compartidas a través de Supabase.
-- No existe comunicación directa Informes_GP -> STATS.
-- ============================================================

create extension if not exists pgcrypto;
grant usage on schema public to anon, authenticated;

create table if not exists public.bmzcn_informes_intradiarios_v2 (
  id uuid primary key default gen_random_uuid(),
  informe_key text,
  guardia_fecha date not null,
  fecha_informe date,
  hora_informe text,
  operativo_key text not null,
  tipo_informe text not null,
  tipo_operativo text default 'GENERICO',
  hora_inicio text,
  hora_fin text,
  lugar text,
  foto_prefijo text,
  datos jsonb not null default '{}'::jsonb,
  calculos jsonb not null default '{}'::jsonb,
  texto_salida text not null,
  origen text not null default 'Informes_GP',
  activo boolean not null default true,
  fecha_evento timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bmzcn_intradiarios_datos_objeto check (jsonb_typeof(datos) = 'object'),
  constraint bmzcn_intradiarios_calculos_objeto check (jsonb_typeof(calculos) = 'object')
);

create unique index if not exists ux_bmzcn_informes_intradiarios_v2_informe_key
on public.bmzcn_informes_intradiarios_v2 (informe_key)
where informe_key is not null and btrim(informe_key) <> '';

create index if not exists idx_bmzcn_informes_intradiarios_v2_guardia
on public.bmzcn_informes_intradiarios_v2 (guardia_fecha);
create index if not exists idx_bmzcn_informes_intradiarios_v2_operativo
on public.bmzcn_informes_intradiarios_v2 (operativo_key);
create index if not exists idx_bmzcn_informes_intradiarios_v2_tipo
on public.bmzcn_informes_intradiarios_v2 (tipo_informe);
create index if not exists idx_bmzcn_informes_intradiarios_v2_fecha
on public.bmzcn_informes_intradiarios_v2 (fecha_evento desc);

create table if not exists public.bmzcn_informes_intradiarios_items_v2 (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null references public.bmzcn_informes_intradiarios_v2(id) on delete cascade,
  guardia_fecha date not null,
  operativo_key text not null,
  tipo_informe text not null,
  tipo_item text not null,
  codigo text not null,
  cantidad numeric not null default 0,
  detalle text,
  datos jsonb not null default '{}'::jsonb,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  constraint bmzcn_intradiarios_items_datos_objeto check (jsonb_typeof(datos) = 'object')
);

create index if not exists idx_bmzcn_intradiarios_items_informe
on public.bmzcn_informes_intradiarios_items_v2 (informe_id);
create index if not exists idx_bmzcn_intradiarios_items_guardia
on public.bmzcn_informes_intradiarios_items_v2 (guardia_fecha);
create index if not exists idx_bmzcn_intradiarios_items_operativo
on public.bmzcn_informes_intradiarios_items_v2 (operativo_key);
create index if not exists idx_bmzcn_intradiarios_items_codigo
on public.bmzcn_informes_intradiarios_items_v2 (codigo);
create index if not exists idx_bmzcn_intradiarios_items_tipo_codigo
on public.bmzcn_informes_intradiarios_items_v2 (tipo_item, codigo);

create or replace function public.bmzcn_v2_actualizar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bmzcn_informes_intradiarios_v2_updated_at
on public.bmzcn_informes_intradiarios_v2;
create trigger trg_bmzcn_informes_intradiarios_v2_updated_at
before update on public.bmzcn_informes_intradiarios_v2
for each row execute function public.bmzcn_v2_actualizar_updated_at();

alter table public.bmzcn_informes_intradiarios_v2 enable row level security;
alter table public.bmzcn_informes_intradiarios_items_v2 enable row level security;

grant select, insert, update, delete on public.bmzcn_informes_intradiarios_v2 to anon, authenticated;
grant select, insert, update, delete on public.bmzcn_informes_intradiarios_items_v2 to anon, authenticated;

drop policy if exists "bmzcn_intradiarios_select" on public.bmzcn_informes_intradiarios_v2;
create policy "bmzcn_intradiarios_select" on public.bmzcn_informes_intradiarios_v2 for select to anon, authenticated using (true);
drop policy if exists "bmzcn_intradiarios_insert" on public.bmzcn_informes_intradiarios_v2;
create policy "bmzcn_intradiarios_insert" on public.bmzcn_informes_intradiarios_v2 for insert to anon, authenticated with check (true);
drop policy if exists "bmzcn_intradiarios_update" on public.bmzcn_informes_intradiarios_v2;
create policy "bmzcn_intradiarios_update" on public.bmzcn_informes_intradiarios_v2 for update to anon, authenticated using (true) with check (true);
drop policy if exists "bmzcn_intradiarios_delete" on public.bmzcn_informes_intradiarios_v2;
create policy "bmzcn_intradiarios_delete" on public.bmzcn_informes_intradiarios_v2 for delete to anon, authenticated using (true);

drop policy if exists "bmzcn_intradiarios_items_select" on public.bmzcn_informes_intradiarios_items_v2;
create policy "bmzcn_intradiarios_items_select" on public.bmzcn_informes_intradiarios_items_v2 for select to anon, authenticated using (true);
drop policy if exists "bmzcn_intradiarios_items_insert" on public.bmzcn_informes_intradiarios_items_v2;
create policy "bmzcn_intradiarios_items_insert" on public.bmzcn_informes_intradiarios_items_v2 for insert to anon, authenticated with check (true);
drop policy if exists "bmzcn_intradiarios_items_update" on public.bmzcn_informes_intradiarios_items_v2;
create policy "bmzcn_intradiarios_items_update" on public.bmzcn_informes_intradiarios_items_v2 for update to anon, authenticated using (true) with check (true);
drop policy if exists "bmzcn_intradiarios_items_delete" on public.bmzcn_informes_intradiarios_items_v2;
create policy "bmzcn_intradiarios_items_delete" on public.bmzcn_informes_intradiarios_items_v2 for delete to anon, authenticated using (true);

alter table public.bmzcn_informes_intradiarios_v2 replica identity full;
alter table public.bmzcn_informes_intradiarios_items_v2 replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'bmzcn_informes_intradiarios_v2'
  ) then
    alter publication supabase_realtime add table public.bmzcn_informes_intradiarios_v2;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'bmzcn_informes_intradiarios_items_v2'
  ) then
    alter publication supabase_realtime add table public.bmzcn_informes_intradiarios_items_v2;
  end if;
end $$;

notify pgrst, 'reload schema';
