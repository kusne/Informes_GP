import { construirResumenRecursosOperativos } from "../compartido/recursos/catalogo-recursos-operativos.js";

function clave(valor) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toUpperCase().replace(/\s+/g," ").trim();
}
function filas(valor, separador) {
  return String(valor??"").split(separador).map(clave).filter(v=>v&&v!=="/").sort();
}
const iguales=(a,b,separador)=>JSON.stringify(filas(a,separador))===JSON.stringify(filas(b,separador));

/**
 * Impide que un FINALIZADO construido con una lista obsoleta vuelva a presentar
 * efectivos o móviles retirados. Los cambios manuales deliberados se respetan,
 * pero siempre deben basarse en el último estado del operativo.
 */
export function validarDotacionFinalizadoContraEstado(estado={},payload={}) {
  const vigente=estado?.datos?.recursos_vigentes;
  if (!vigente || !Object.keys(vigente).length) return true;
  const recursos=payload?.datos?.recursos_finalizado||{};
  const version=String(recursos.estado_dotacion_version||"");
  if (!version || version!==String(estado.updated_at||"")) {
    throw Error("La dotación cambió o no pudo verificarse al FINALIZAR. Volvé a abrir el operativo para utilizar el último RELEVO o RETIRO.");
  }
  const esperado=construirResumenRecursosOperativos(vigente);
  const diferencias=[];
  if (recursos.fuente_personal==="INICIO" &&
    !iguales(recursos.personal,esperado.personal,/\r?\n/))
    diferencias.push("personal");
  if (recursos.fuente_movilidad==="INICIO" &&
    !iguales(recursos.moviles_motos,esperado.moviles_motos,/\s*\/\s*/))
    diferencias.push("móviles");
  if (recursos.fuente_elementos==="INICIO" &&
    !iguales(recursos.elementos,esperado.elementos,/\r?\n/))
    diferencias.push("elementos");
  if (diferencias.length) {
    throw Error("El FINALIZADO no coincide con los recursos vigentes ("+
      diferencias.join(", ")+"). Reabrí el operativo y verificá el último RELEVO/RETIRO.");
  }
  return true;
}
