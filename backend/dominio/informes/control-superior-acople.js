import { calcularMovimientoRecursos } from "../compartido/recursos/movimientos-recursos.js";

// Un CONTROL SUPERIOR es informativo salvo que "SE ACOPLA" esté expresamente
// seleccionado. El móvil consignado en PERSONAL POLICIAL / MÓVIL/ES corresponde
// a la dotación previa; sólo los controles del formulario son incorporaciones.
export function seleccionAcopleControlSuperior(formulario = {}) {
  const f = formulario || {};
  const personal = [];
  if (f.autoridad_jefe === true) personal.push("JEFE");
  if (f.autoridad_subjefe === true) personal.push("SUBJEFE");
  if (f.autoridad_otros === true && String(f.nombre_autoridad || "").trim())
    personal.push(String(f.nombre_autoridad).trim());
  const moviles = [];
  if (f.movil_12428 === true) moviles.push("12428");
  if (f.movil_otro === true) {
    for (const numero of String(f.moviles_otros || "").split(/[\s,;/]+/)) {
      const limpio = numero.trim().replace(/^M\/?/i, "");
      if (/^\d{3,6}$/.test(limpio)) moviles.push(limpio);
    }
  }
  return { personal: [...new Set(personal)], moviles: [...new Set(moviles)], motos: [], elementos: {} };
}
export function crearAcopleDesdeControlSuperior({formulario,actual,informe_key}={}) {
  if (formulario?.se_acopla !== true) return null;
  const seleccion = seleccionAcopleControlSuperior(formulario);
  if (!seleccion.personal.length && !seleccion.moviles.length)
    throw Error("SE ACOPLA requiere seleccionar personal o móviles de la autoridad.");
  const movimiento = calcularMovimientoRecursos({modo:"ACOPLE",actual,seleccion});
  return {...movimiento,origen:"CONTROL_SUPERIOR",informe_key:String(informe_key||"")};
}
