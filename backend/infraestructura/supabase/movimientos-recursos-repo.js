import { textoMovimiento } from "../../dominio/movimientos/texto-movimiento.js";
import { validarAsignacionesAcople } from "../../dominio/compartido/texto/acople-observaciones.js";
import { obtenerEstadoOperativoV2 } from "./operativos-estado-v2-repo.js";
import { supabase, TABLAS_SUPABASE } from "./supabase-client.js";
import { resolverRecursosInicioParaFinaliza } from "../../dominio/finaliza/recursos-finaliza.js";
import { calcularMovimientoRecursos } from "../../dominio/compartido/recursos/movimientos-recursos.js";

export function dotacionVigenteOperativo(operativo={}){
 const datos=typeof operativo.datos==='object'&&operativo.datos?operativo.datos:{};
 if(datos.recursos_vigentes)return datos.recursos_vigentes;
 return resolverRecursosInicioParaFinaliza(operativo).seleccionInicial;
}

export { textoMovimiento };
export async function guardarMovimientoOperativo({modo,operativo_key,guardia_fecha,seleccion}={}){
 if(!supabase)throw Error('No hay conexión con Supabase.');
 const row=await obtenerEstadoOperativoV2({operativo_key,guardia_fecha});
 if(!row || row.estado!=='EN_CURSO')throw Error('El operativo ya no está EN CURSO.');
 const movimiento=calcularMovimientoRecursos({
  modo,actual:dotacionVigenteOperativo(row),seleccion
 });
 const hora=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
 const fecha=new Date().toISOString();
 // Asociación documental opcional, validada contra las altas reales.
 // Se conserva en el evento histórico, NUNCA en recursos_vigentes.
 if(movimiento.modo==='ACOPLE'){
  movimiento.asignaciones_moviles=validarAsignacionesAcople(
   movimiento,seleccion?.asignaciones_moviles
  );
 }
 const texto=textoMovimiento(movimiento,row,hora);
 const datos={...(row.datos||{})};
 const historial=Array.isArray(datos.movimientos_recursos)?datos.movimientos_recursos:[];
 datos.recursos_vigentes=movimiento.vigente;
 datos.movimientos_recursos=[...historial,{...movimiento,fecha_evento:fecha,texto}];
 let query=supabase.from(TABLAS_SUPABASE.operativosEstado)
  .update({datos,updated_at:fecha}).eq('id',row.id).eq('estado','EN_CURSO');
 if(row.updated_at)query=query.eq('updated_at',row.updated_at);
 const {data,error}=await query.select('id').maybeSingle();
 if(error)throw error;
 if(!data)throw Error('La dotación cambió en otro dispositivo. Volvé a abrir el formulario antes de enviar.');
 return {texto,movimiento,fecha_evento:fecha};
}
