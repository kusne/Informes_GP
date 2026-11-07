
import { construirTextoInicioBase } from "./plantilla.js";
import { construirResumenRecursosOperativos } from "../../compartido/recursos/catalogo-recursos-operativos.js";
import { redactarObservacionRelevo } from "../../compartido/texto/relevo-observaciones.js";

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

export function construirInformeRELEVO(m,operativo,hora) {
 const actual=m.vigente;
 const resumen=construirResumenRecursosOperativos({
   personal:ordenarPersonal(actual.personal),
   moviles:actual.moviles,
   motos:actual.motos,
   elementos:actual.elementos
 });
 const datos=operativo.datos||{};
 const inicio=datos.inicio_snapshot||{};
 return construirTextoInicioBase({
   prefijoTitulo:"RELEVO",
   // Horario de INICIO; la hora del movimiento va en Observaciones.
   horarioReporte:(!operativo.hora_inicio && !operativo.hora_fin) ? hora+" HS" : "",
   fecha_operativo:datos.fecha_operativo||inicio.fecha_operativo||operativo.guardia_fecha,
   hora_inicio:operativo.hora_inicio,
   hora_fin:operativo.hora_fin,
   lugar:operativo.lugar,
   tipo_operativo:operativo.tipo_operativo,
   operativo,
   formulario:{...resumen,observaciones:redactarObservacionRelevo(m,hora,{tratamientosPersonal:operativo?.datos?.tratamientos_personal})}
 });
}
