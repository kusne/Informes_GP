import { construirTextoInicioBase } from "./plantilla.js";
import { construirResumenRecursosOperativos, presentarPersonalOperativo } from "../../compartido/recursos/catalogo-recursos-operativos.js";
const movilidad=r=>[...(r?.moviles||[]),...(r?.motos||[])];
const personal=r=>(r?.personal||[]).map(x=>presentarPersonalOperativo(x).valor).join(" y ");
const equipos=r=>Object.entries(r?.elementos||{}).flatMap(([k,v])=>v.map(x=>k+" "+x)).join(" / ");
const rotular=(r,k)=>k==="personal"?personal(r):k==="movilidad"?movilidad(r).map(x=>"N° "+x).join(" / "):equipos(r);
const nombre={personal:"personal policial",movilidad:"móviles",elementos:"elementos"};
export function tituloMovimientoUnificado(m){
 const cs=m.clasificaciones||[];
 if(cs.length===1&&cs[0].tipo==="RELEVO")return "RELEVO "+cs[0].alcance;
 if(cs.length===1&&cs[0].tipo==="INTERCAMBIO")return cs[0].recurso==="movilidad"?"INTERCAMBIO DE MÓVILES":"INTERCAMBIO DE ELEMENTOS";
 if(m.modo==="ACOPLE"||m.modo==="RETIRO")return m.modo;
 return "MOVIMIENTO DE RECURSOS";
}
export function redactarObservacionesUnificadas(m,hora){
 const partes=[];
 for(const c of m.clasificaciones||[]){
  const k=c.recurso,sale=rotular(m.retirados,k),entra=rotular(m.incorporados,k),n=nombre[k];
  if(c.tipo==="INTERCAMBIO")partes.push("se realiza intercambio de "+n+": se retiran "+sale+" y quedan afectados "+entra);
  else if(c.tipo==="RELEVO")partes.push("se realiza relevo "+c.alcance.toLowerCase()+" de personal policial: se retira "+sale+" y se incorpora "+entra);
  else if(c.tipo==="ACOPLE")partes.push("se incorpora al operativo "+n+": "+entra);
  else if(c.tipo==="RETIRO")partes.push("se retira del operativo "+n+": "+sale);
 }
 const i=m.intervinientes||{},visitas=[personal(i),movilidad(i).map(x=>"móvil N° "+x).join(" / "),equipos(i)].filter(Boolean);
 let texto="Siendo las "+hora+" hs "+partes.join("; ")+".";
 if(visitas.length)texto+=" Intervienen "+visitas.join("; ")+", sin incorporarse a la dotación del operativo.";
 texto+=" La dotación restante continúa afectada al operativo.";
 return texto;
}
export function construirInformeMovimientoUnificado(m,operativo,hora){
 const datos=operativo.datos||{},inicio=datos.inicio_snapshot||{};
 return construirTextoInicioBase({prefijoTitulo:tituloMovimientoUnificado(m),
 horarioReporte:(!operativo.hora_inicio&&!operativo.hora_fin)?hora+" HS":"",
 fecha_operativo:datos.fecha_operativo||inicio.fecha_operativo||operativo.guardia_fecha,
 hora_inicio:operativo.hora_inicio,hora_fin:operativo.hora_fin,lugar:operativo.lugar,
 tipo_operativo:operativo.tipo_operativo,operativo,
 formulario:{...construirResumenRecursosOperativos(m.vigente),observaciones:redactarObservacionesUnificadas(m,hora)}});
}
