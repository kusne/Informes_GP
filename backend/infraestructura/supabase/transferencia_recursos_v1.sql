-- Escritura conjunta, sin elevar permisos ni modificar las políticas RLS existentes.
create or replace function public.bmzcn_guardar_transferencia_recursos_v1(p_movimientos jsonb)
returns integer language plpgsql security invoker set search_path = ''
as $$
declare item jsonb; fila public.bmzcn_operativos_estado_v2%rowtype; evento jsonb; cuenta integer:=0; historial jsonb;
begin
 if jsonb_typeof(p_movimientos) is distinct from 'array' then raise exception 'Se requieren dos movimientos'; end if;
 if jsonb_array_length(p_movimientos)<>2 then raise exception 'Se requieren dos movimientos'; end if;
 if (p_movimientos->0->>'id') is null or (p_movimientos->1->>'id') is null
 or (p_movimientos->0->>'id')=(p_movimientos->1->>'id') then raise exception 'Operativos distintos requeridos'; end if;
 if (p_movimientos->0->'movimiento'->>'movimiento_id') is null or (p_movimientos->0->'movimiento'->>'movimiento_id') is distinct from (p_movimientos->1->'movimiento'->>'movimiento_id') then raise exception 'Identificador de transferencia inválido'; end if;
 -- Bloqueo ordenado de ambas filas. Una excepción revierte todas las escrituras.
 for item in select value from jsonb_array_elements(p_movimientos) order by value->>'id' loop
  select * into fila from public.bmzcn_operativos_estado_v2 where id=(item->>'id')::uuid for update;
  if not found or fila.estado is distinct from 'EN_CURSO' or fila.updated_at is null or fila.updated_at is distinct from (item->>'expected_updated_at')::timestamptz then raise exception 'La dotación cambió o no está disponible'; end if;
  evento:=item->'movimiento';
  if jsonb_typeof(evento->'vigente') is distinct from 'object' or jsonb_typeof(evento->'anterior') is distinct from 'object' or coalesce(evento->>'texto','')='' then raise exception 'Movimiento inválido'; end if;
  if jsonb_typeof(fila.datos->'recursos_vigentes')='object' and (fila.datos->'recursos_vigentes'->'personal') is distinct from (evento->'anterior'->'personal') then raise exception 'La dotación anterior no coincide'; end if;
  historial:=case when jsonb_typeof(fila.datos->'movimientos_recursos')='array' then fila.datos->'movimientos_recursos' else '[]'::jsonb end;
  update public.bmzcn_operativos_estado_v2 set datos=coalesce(fila.datos,'{}'::jsonb)||jsonb_build_object('recursos_vigentes',evento->'vigente','movimientos_recursos',historial||jsonb_build_array(evento)),updated_at=clock_timestamp() where id=fila.id and estado='EN_CURSO';
  if not found then raise exception 'No se pudo actualizar uno de los operativos'; end if;
  cuenta:=cuenta+1;
 end loop;
 return cuenta;
end; $$;
revoke all on function public.bmzcn_guardar_transferencia_recursos_v1(jsonb) from public;
grant execute on function public.bmzcn_guardar_transferencia_recursos_v1(jsonb) to authenticated, anon;
