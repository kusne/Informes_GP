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

  constraint operativos_estado_v2_unique_key
    unique (guardia_fecha, operativo_key),

  constraint operativos_estado_v2_estado_check
    check (estado in ('EN_CURSO', 'FINALIZADO')),

  constraint operativos_estado_v2_tipo_evento_check
    check (tipo_evento in ('INICIO', 'FINALIZADO'))
);

create index if not exists idx_operativos_estado_v2_guardia_fecha
on public.operativos_estado_v2 (guardia_fecha);

create index if not exists idx_operativos_estado_v2_estado
on public.operativos_estado_v2 (estado);

create index if not exists idx_operativos_estado_v2_guardia_estado_hora
on public.operativos_estado_v2 (guardia_fecha, estado, hora_inicio, hora_fin);

create index if not exists idx_operativos_estado_v2_operativo_key
on public.operativos_estado_v2 (operativo_key);