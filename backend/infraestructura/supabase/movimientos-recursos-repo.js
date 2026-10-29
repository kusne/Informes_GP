import { obtenerEstadoOperativoV2 } from "./operativos-estado-v2-repo.js";
import { supabase, TABLAS_SUPABASE } from "./supabase-client.js";
import { resolverRecursosInicioParaFinaliza } from "../../dominio/finaliza/recursos-finaliza.js";
import { calcularMovimientoRecursos } from "../../dominio/compartido/recursos/movimientos-recursos.js";
import { construirTextoInicioBase } from "../../dominio/inicia/inicio-salida-texto-base.js";
import { construirResumenRecursosOperativos } from "../../dominio/compartido/recursos/catalogo-recursos-operativos.js";

export function dotacionVigenteOperativo(operativo={}){
 const datos=typeof operativo.datos==='object'&&operativo.datos?operativo.datos:{};
 if(datos.recursos_vigentes)return datos.recursos_vigentes;
 return resolverRecursosInicioParaFinaliza(operativo).seleccionInicial;
}
const movilidad = r => [...(r?.moviles || []), ...(r?.motos || [])];
const mostrar = valores => (valores || []).filter(Boolean).join(" / ");
const RANGOS = ["COMISARIO GENERAL","COMISARIO MAYOR","COMISARIO SUPERVISOR","COMISARIO",
  "SUBCOMISARIO","INSPECTOR","SUBINSPECTOR","OFICIAL PRINCIPAL","OFICIAL",
  "SUBOFICIAL MAYOR","SUBOFICIAL PRINCIPAL","SUBOFICIAL","SARGENTO","CABO","AGENTE"];
function ordenarPersonal(personal = []) {
 const posicion = nombre => {
  const n=String(nombre).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  const i=RANGOS.findIndex(r=>n===r||n.startsWith(r+" ")||n.startsWith(r+" DE POLICIA "));
  return i<0?RANGOS.length:i;
 };
 // Orden estable: el catálogo ya ordena por N.I. dentro de cada jerarquía.
 return [...personal].sort((a,b)=>posicion(a)-posicion(b));
}
function redactarObservacionMovimiento(m,hora){
 const partes=[];
 const retirados=movilidad(m.retirados),incorporados=movilidad(m.incorporados);
 if(m.modo==="RELEVO"){
  const salientes=ordenarPersonal(m.retirados.personal);
  partes.push("Siendo las "+hora+" hs se procede a efectuar el relevo del operativo.");
  if(retirados.length && salientes.length){
   partes.push((retirados.length===1?"Se releva al Móvil N° ":"Se relevan los Móviles N° ")+mostrar(retirados)+
    ", a cargo del personal saliente: "+salientes.join(", ")+".");
   partes.push("Dicho personal y móvil/es se retiran del lugar.");
  }else if(retirados.length){
   partes.push((retirados.length===1?"Se retira el Móvil N° ":"Se retiran los Móviles N° ")+mostrar(retirados)+".");
  }else if(salientes.length){
   partes.push("Personal que se retira: "+salientes.join(", ")+".");
  }else{
   // Puede haber relevo sólo de elementos: no atribuir bajas inexistentes
   // ni volver a contar personal y móviles retirados en informes anteriores.
   partes.push("En este relevo no se registra retiro de personal ni de móviles.");
  }
  const retiradosElementos=Object.values(m.retirados.elementos||{}).flat();
  if(retiradosElementos.length)partes.push("Elementos retirados: "+mostrar(retiradosElementos)+".");
  partes.push("Acto seguido permanece en el lugar el personal, los móviles y los elementos detallados ut-supra.");
 }else if(m.modo==='RETIRO'){
  const salientes=ordenarPersonal(m.retirados.personal||[]);
  const elementos=Object.values(m.retirados.elementos||{}).flat();
  const personas=salientes.length<2?salientes.join(''):
    salientes.slice(0,-1).join(', ')+' y '+salientes[salientes.length-1];
  let accion='';
  if(salientes.length===1 && retirados.length===1){
   accion='se retira el '+personas+' con móvil '+retirados[0];
  }else if(salientes.length && retirados.length===1){
   accion='se retira el personal policial '+personas+' con móvil '+retirados[0];
  }else if(salientes.length && retirados.length>1){
   accion='se retiran los móviles '+mostrar(retirados)+' junto al personal policial '+personas;
  }else if(salientes.length===1){
   accion='se retira el '+personas;
  }else if(salientes.length>1){
   accion='se retira el personal policial '+personas;
  }else if(retirados.length===1){
   accion='se retira el móvil '+retirados[0];
  }else if(retirados.length>1){
   accion='se retiran los móviles '+mostrar(retirados);
  }
  if(accion)partes.push('Siendo las '+hora+' hs '+accion+'.');
  if(elementos.length)partes.push(
   (accion?'Se retiran además los siguientes elementos: ':'Siendo las '+hora+' hs se retiran los siguientes elementos: ')+mostrar(elementos)+'.');
  partes.push('La dotación restante continúa afectada al operativo.');
 }else{
  // ACOPLE: describir el hecho como un informe policial, no como una lista de
  // diferencias del sistema. La dotación completa ya figura arriba y el
  // detalle exacto de altas permanece en m.incorporados para el historial.
  partes.push("Siendo las "+hora+" hs se procede al acople de recursos al operativo.");
  const ingresantes=ordenarPersonal(m.incorporados.personal||[]);
  const personalEnFrase=ingresantes.length<2?ingresantes.join(""):
    ingresantes.slice(0,-1).join(", ")+" y "+ingresantes[ingresantes.length-1];
  if(incorporados.length){
   partes.push((incorporados.length===1?"Se incorpora el Móvil N° ":"Se incorporan los Móviles N° ")+mostrar(incorporados)+".");
   if(ingresantes.length)partes.push("A cargo de "+personalEnFrase+".");
  }else if(ingresantes.length){
   partes.push("Se incorpora al operativo el personal policial "+personalEnFrase+".");
  }
  // Para acoples sólo de equipamiento es imprescindible describir qué cambió.
  // En los demás casos los elementos incorporados ya se detallan en el cuerpo.
  if(!incorporados.length&&!ingresantes.length){
   const elementos=Object.values(m.incorporados.elementos||{}).flat();
   if(elementos.length)partes.push("Se incorporan los siguientes elementos: "+mostrar(elementos)+".");
  }
 }
 return partes.join(" ");
}
export function textoMovimiento(m,operativo,hora){
 const actual=m.vigente;
 const resumen=construirResumenRecursosOperativos({
  personal:ordenarPersonal(actual.personal),
  moviles:actual.moviles,
  motos:actual.motos,
  elementos:actual.elementos
 });
 const datos=operativo.datos||{};
 const inicio=datos.inicio_snapshot||{};
 const base=construirTextoInicioBase({
  prefijoTitulo:m.modo,
  // Horario institucional: conservar la franja del INICIO; la hora exacta del movimiento va en Observaciones.
  horarioReporte:(!operativo.hora_inicio && !operativo.hora_fin) ? hora+" HS" : "",
  fecha_operativo:datos.fecha_operativo||inicio.fecha_operativo||operativo.guardia_fecha,
  hora_inicio:operativo.hora_inicio,
  hora_fin:operativo.hora_fin,
  lugar:operativo.lugar,
  tipo_operativo:operativo.tipo_operativo,
  operativo,
  formulario:{...resumen,observaciones:redactarObservacionMovimiento(m,hora)}
 });
 // El informe muestra únicamente los recursos vigentes; las bajas se conservan
 // en movimiento.retirados para el historial y la auditoría.
 return base;
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
