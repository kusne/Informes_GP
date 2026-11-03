// ACOPLE — contrato institucional encapsulado. Su texto es independiente de
// la persistencia, el cálculo de recursos y los formatos RELEVO/RETIRO.
// Cambios en esta narración deben pasar las pruebas de regresión específicas.
const ETIQUETAS = Object.freeze({
  pda: "Pda", ht: "Ht", escopetas: "Escopeta",
  impresoras: "Impresora", alometros: "Alómetro",
  alcoholimetros: "Alcoholímetro"
});
const ORDEN_ELEMENTOS = Object.freeze([
  "pda", "ht", "escopetas", "impresoras", "alometros", "alcoholimetros"
]);
const RANGOS = Object.freeze([
  "COMISARIO GENERAL", "COMISARIO MAYOR", "COMISARIO SUPERVISOR", "COMISARIO",
  "SUBCOMISARIO", "INSPECTOR", "SUBINSPECTOR", "OFICIAL PRINCIPAL", "OFICIAL",
  "SUBOFICIAL MAYOR", "SUBOFICIAL PRINCIPAL", "SUBOFICIAL", "SARGENTO", "CABO", "AGENTE"
]);

const lista = valores => [...new Set((Array.isArray(valores) ? valores : [])
  .map(valor => String(valor ?? "").trim()).filter(Boolean))];

function prioridad(nombre) {
  const normalizado = String(nombre).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const indice = RANGOS.findIndex(r => normalizado === r
    || normalizado.startsWith(r + " ") || normalizado.startsWith(r + " DE POLICIA "));
  return indice < 0 ? RANGOS.length : indice;
}
function personalOrdenado(valores) {
  return lista(valores).sort((a,b) => prioridad(a) - prioridad(b));
}
function enumerar(valores) {
  const items = lista(valores);
  return items.length <= 1 ? (items[0] || "")
    : items.slice(0, -1).join(", ") + " y " + items[items.length - 1];
}
function elementosIncorporados(grupos = {}) {
  const claves = Object.keys(grupos || {}).sort((a,b) => {
    const pa = ORDEN_ELEMENTOS.indexOf(a), pb = ORDEN_ELEMENTOS.indexOf(b);
    return (pa < 0 ? ORDEN_ELEMENTOS.length : pa) -
      (pb < 0 ? ORDEN_ELEMENTOS.length : pb) || a.localeCompare(b);
  });
  return claves.flatMap(clave => lista(grupos[clave]).map(valor =>
    (ETIQUETAS[clave] || "Elemento") + " " + valor));
}

// El vínculo móvil-personal SOLO procede de una asignación explícita.
// No interpretar que seleccionar personal y móviles implica que viajan juntos.
export function validarAsignacionesAcople(movimiento = {}, asignaciones = {}) {
  if (asignaciones == null) return {};
  if (typeof asignaciones !== "object" || Array.isArray(asignaciones))
    throw Error("ACOPLE: las asignaciones por móvil deben tener formato válido.");
  const ingresan = movimiento.incorporados || {};
  const moviles = lista([...(ingresan.moviles || []), ...(ingresan.motos || [])]);
  const personal = lista(ingresan.personal);
  const personasYaAsignadas = new Set();
  const limpio = {};
  for (const [numero, miembros] of Object.entries(asignaciones)) {
    if (!moviles.includes(numero))
      throw Error("ACOPLE: el móvil " + numero + " no se incorpora en este evento.");
    if (!Array.isArray(miembros))
      throw Error("ACOPLE: la dotación asociada al móvil " + numero + " es inválida.");
    const nombres = lista(miembros);
    for (const nombre of nombres) {
      if (!personal.includes(nombre))
        throw Error("ACOPLE: el personal asignado al móvil " + numero + " no se incorpora en este evento: " + nombre + ".");
      if (personasYaAsignadas.has(nombre))
        throw Error("ACOPLE: un efectivo no puede asignarse a dos móviles: " + nombre + ".");
      personasYaAsignadas.add(nombre);
    }
    if (nombres.length) limpio[numero] = personalOrdenado(nombres);
  }
  return limpio;
}

// Sólo construye Observaciones. No muta el historial, la dotación ni Supabase.
export function redactarObservacionAcople(movimiento = {}, hora = "") {
  const recursos = movimiento.incorporados || {};
  const personal = personalOrdenado(recursos.personal);
  const moviles = lista([...(recursos.moviles || []), ...(recursos.motos || [])]);
  const elementos = elementosIncorporados(recursos.elementos);
  const asignaciones = validarAsignacionesAcople(movimiento, movimiento.asignaciones_moviles);
  const asociados = new Set(Object.values(asignaciones).flat());
  const sinAsignar = personal.filter(nombre => !asociados.has(nombre));
  const seAcoplan = (personal.length + moviles.length + elementos.length) === 1
    ? "se acopla" : "se acoplan";
  const comienzo = "Siendo las " + String(hora).trim() + " hs " + seAcoplan + " al operativo ";

  const seccionesMoviles = moviles.map((numero,indice) => {
    const titulo = (indice === 0 ? "el Móvil N° " : "Móvil N° ") + numero;
    const asignados = asignaciones[numero] || [];
    return titulo + (asignados.length ? " a cargo de " + enumerar(asignados) : "");
  });
  let relato = "";
  if (seccionesMoviles.length) {
    relato = comienzo + seccionesMoviles.join("; ");
    if (sinAsignar.length)
      relato += "; asimismo, se incorpora el personal policial " + enumerar(sinAsignar);
  } else if (personal.length) {
    relato = comienzo + enumerar(personal);
  } else if (elementos.length) {
    relato = comienzo + "los siguientes Elementos: " + enumerar(elementos);
  } else {
    throw Error("ACOPLE: no existen recursos nuevos para redactar el informe.");
  }

  if (elementos.length && (personal.length || moviles.length)) {
    relato += "; asimismo, se incorporan los siguientes Elementos: " + enumerar(elementos);
  }
  return relato + ".";
}
