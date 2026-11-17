-- Decreto 460/22: proyección pública MINIMA del cierre confirmado por Desktop.
-- No se expone el responsable, documentos ni actuaciones de bmzcn_guardias_control.
-- La tabla original conserva íntegramente sus políticas RLS de acceso privado.
create table if not exists public.bmzcn_guardias_estado_informes_gp_v1 (
  guardia_fecha date primary key references public.bmzcn_guardias_control(guardia_fecha) on delete cascade,
  estado text not null check (estado in ('VIGENTE','EXTENDIDA','BLOQUEO_PREVENTIVO','FINALIZADA')),
  actualizada_en timestamptz not null default now()
);
alter table public.bmzcn_guardias_estado_informes_gp_v1 enable row level security;
revoke all on public.bmzcn_guardias_estado_informes_gp_v1 from public, anon, authenticated;
grant select on public.bmzcn_guardias_estado_informes_gp_v1 to anon, authenticated;
drop policy if exists lectura_reciente_guardia_46022 on public.bmzcn_guardias_estado_informes_gp_v1;
create policy lectura_reciente_guardia_46022
  on public.bmzcn_guardias_estado_informes_gp_v1
  for select to anon, authenticated
  using (
    guardia_fecha >= ((now() at time zone 'America/Argentina/Buenos_Aires')::date - 7)
    and guardia_fecha <= (now() at time zone 'America/Argentina/Buenos_Aires')::date
  );

-- Sincronización transaccional, ejecutada únicamente al cambiar estado en
-- Desktop o al crear el control. Nunca se permite escritura desde Informes GP.
create or replace function bmzcn_maintenance.sincronizar_guardia_informes_gp_v1()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.bmzcn_guardias_estado_informes_gp_v1
    (guardia_fecha, estado, actualizada_en)
  values (new.guardia_fecha, new.estado, now())
  on conflict (guardia_fecha) do update
    set estado = excluded.estado, actualizada_en = excluded.actualizada_en;
  return new;
end;
$$;
revoke all on function bmzcn_maintenance.sincronizar_guardia_informes_gp_v1()
  from public, anon, authenticated;
drop trigger if exists bmzcn_guardia_informes_gp_v1 on public.bmzcn_guardias_control;
create trigger bmzcn_guardia_informes_gp_v1
after insert or update of estado on public.bmzcn_guardias_control
for each row execute function bmzcn_maintenance.sincronizar_guardia_informes_gp_v1();

-- Semilla del histórico ya existente, también sin identificación personal.
insert into public.bmzcn_guardias_estado_informes_gp_v1
  (guardia_fecha, estado, actualizada_en)
select guardia_fecha, estado, actualizada_en
from public.bmzcn_guardias_control
on conflict (guardia_fecha) do update
  set estado = excluded.estado, actualizada_en = excluded.actualizada_en;
