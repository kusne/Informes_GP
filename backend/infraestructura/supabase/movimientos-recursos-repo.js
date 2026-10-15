import { obtenerEstadoOperativoV2 } from "./operativos-estado-v2-repo.js";
import { supabase, TABLAS_SUPABASE } from "./supabase-client.js";
import { resolverRecursosInicioParaFinaliza } from "../../dominio/finaliza/recursos-finaliza.js";
import { calcularMovimientoRecursos } from "../../dominio/compartido/recursos/movimientos-recursos.js";

export function dotacionVigenteOperativo(operativo={}){
 const datos=typeof operativo.datos==='object'&&operativo.datos?operativo.datos:{};
 if(datos.recursos_vigentes)return datos.recursos_vigentes;
 return resolverRecursosInicioParaFinaliza(operativo).seleccionInicial;
}
const union=arr=>(arr||[]).filter(Boolean).join(' / ')||'/';
export function textoMovimiento(m,operativo,hora){
 const previo=m.anterior,despues=m.vigente;
 const lista=(r)=>[...(r.moviles||[]),...(r.motos||[])];
 const elementos=r=>Object.entries(r.elementos||{}).flatMap(([k,v])=>v.map(n=>k+': '+n));
 const descripcion=(r)=>'*Personal Policial:*\n'+(r.personal||[]).join('\n')+'\n\n*Móviles:* '+union(lista(r))+'\n\n*Elementos:*\n'+[['escopetas','Escopetas'],['ht','Ht'],['pda','Pda'],['impresoras','Impresoras'],['alometros','Alómetros'],['alcoholimetros','Alcoholímetros']].map(([k,n])=>n+': '+union(r.elementos?.[k])).join('\n');
 const ordenes=Array.isArray(operativo.ordenes_origen)?operativo.ordenes_origen:(operativo.datos?.ordenes_origen||[]);
 const observacion=m.modo==='RELEVO'
 ? ['Siendo las '+hora+' hs se procede al relevo del operativo.',
   lista(m.retirados).length?'Se retira/n el/los móvil/es N° '+union(lista(m.retirados))+'.':'',
   m.retirados.personal.length?'Personal saliente: '+m.retirados.personal.join(', ')+'.':'',
   'Acto seguido permanecen en el lugar el personal y móvil/es indicados ut-supra.'].filter(Boolean).join(' ')
 : ['Siendo las '+hora+' hs se procede al acople de recursos al operativo.',
   lista(m.incorporados).length?'Se incorpora/n el/los móvil/es N° '+union(lista(m.incorporados))+'.':'',
   m.incorporados.personal.length?'Personal incorporado: '+m.incorporados.personal.join(', ')+'.':'',
   elementos(m.incorporados).length?'Elementos incorporados: '+union(elementos(m.incorporados))+'.':'',
   'Permanecen afectados los recursos previamente asignados.'].filter(Boolean).join(' ');
 return '*Policia de la Provincia de Santa Fe - Direccion General Guardia Provincial*\n'+
 '*Brigada Motorizada Centro Norte*\n*Tercio Charlie*\n\n'+
 '*'+m.modo+' '+(operativo.tipo_nombre||operativo.tipo_operativo||'Operativo')+
 (ordenes.length?' - '+ordenes.join(' - '):'')+'*\n\n'+
 '*Fecha:* '+String(operativo.datos?.fecha_operativo||operativo.guardia_fecha).replace(/^(\d{4})-(\d{2})-(\d{2})$/,'$3/$2/$1')+'\n*Horario:* '+hora+' HS\n'+
 '*Lugar:* '+operativo.lugar+'\n\n'+descripcion(despues)+'\n\n*Observaciones:*\n'+observacion;
}
export async function guardarMovimientoOperativo({modo,operativo_key,guardia_fecha,seleccion}={}){
 if(!supabase)throw Error('No hay conexión con Supabase.');
 const row=await obtenerEstadoOperativoV2({operativo_key,guardia_fecha});
 if(!row || row.estado!=='EN_CURSO')throw Error('El operativo ya no está EN CURSO.');
 const movimiento=calcularMovimientoRecursos({
  modo,actual:dotacionVigenteOperativo(row),seleccion
 });
 const hora=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
 const fecha=new Date().toISOString();
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
