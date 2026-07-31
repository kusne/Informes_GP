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

  constraint operativos_programados_v2_unique_key
    unique (guardia_fecha, operativo_key)
);

create index if not exists idx_operativos_programados_v2_guardia_fecha
on public.operativos_programados_v2 (guardia_fecha);

create index if not exists idx_operativos_programados_v2_activo
on public.operativos_programados_v2 (activo);

create index if not exists idx_operativos_programados_v2_guardia_activo_hora
on public.operativos_programados_v2 (guardia_fecha, activo, hora_inicio, hora_fin);