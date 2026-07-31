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