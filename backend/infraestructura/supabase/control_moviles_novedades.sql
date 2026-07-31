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