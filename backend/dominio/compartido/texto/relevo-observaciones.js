// RELEVO — contrato institucional aislado: no alterar sin actualizar las pruebas
// de regresión y verificar el formato aprobado del informe.
// Los tratamientos sólo provienen de una confirmación explícita; jamás se
// deducen del nombre, el apellido ni la jerarquía.
const TRATAMIENTOS_CONFIRMADOS = Object.freeze({
  "SUBOFICIAL DE POLICIA LOPEZ CARLOS DANIEL": "el",
  "SUBOFICIAL DE POLICIA DELGADO YASMILA AILEN": "la",
  "SUBOFICIAL DE POLICIA DELGADO YASMILA AILIN": "la"
});

const ETIQUETAS_ELEMENTOS = Object.freeze({
  pda: "Pda", ht: "Ht", escopetas: "Escopeta",
  impresoras: "Impresora", alometros: "Alómetro",
  alcoholimetros: "Alcoholímetro"
});
const ORDEN_ELEMENTOS = Object.freeze([
  "pda", "ht", "escopetas", "impresoras", "alometros", "alcoholimetros"
]);

function clave(valor) {
  return String(valor ?? "").trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ");
}
function lista(valores) {
  return [...new Set((Array.isArray(valores) ? valores : [])
    .map(x => String(x ?? "").trim()).filter(Boolean))];
}
function enumerar(valores) {
  const items = lista(valores);
  if (items.length < 2) return items[0] || "";
  return items.slice(0, -1).join(", ") + " y " + items[items.length - 1];
}
function articuloConfirmado(persona, tratamientos) {
  const clavePersona = clave(persona);
  const adicionales = Object.entries(tratamientos && typeof tratamientos === "object" ? tratamientos : {});
  const valor = adicionales.find(([nombre]) => clave(nombre) === clavePersona)?.[1]
    ?? TRATAMIENTOS_CONFIRMADOS[clavePersona];
  const tipo = clave(valor);
  if (["LA", "F", "FEMENINO", "FEMENINA"].includes(tipo)) return "la";
  if (["EL", "M", "MASCULINO"].includes(tipo)) return "el";
  return "";
}
function equiposRetirados(grupos = {}) {
  const keys = Object.keys(grupos || {}).sort((a, b) => {
    const pa = ORDEN_ELEMENTOS.indexOf(a), pb = ORDEN_ELEMENTOS.indexOf(b);
    return (pa < 0 ? ORDEN_ELEMENTOS.length : pa)
      - (pb < 0 ? ORDEN_ELEMENTOS.length : pb) || a.localeCompare(b);
  });
  return keys.flatMap(grupo => lista(grupos[grupo]).map(numero =>
    (ETIQUETAS_ELEMENTOS[grupo] || "Elemento") + " " + numero));
}

// Esta función es pura: nunca altera la dotación, los movimientos ni Supabase.
// Recibe el diferencial de bajas ya calculado y redacta sólo las Observaciones.
export function redactarObservacionRelevo(movimiento = {}, hora = "", { tratamientosPersonal = {} } = {}) {
  const bajas = movimiento.retirados || {};
  const personal = lista(bajas.personal);
  const moviles = lista([...(bajas.moviles || []), ...(bajas.motos || [])]);
  const elementos = equiposRetirados(bajas.elementos);
  let frase = "Siendo las " + String(hora).trim() + " hs se procede a efectuar el relevo del operativo";

  if (personal.length) {
    const articulo = articuloConfirmado(personal[0], tratamientosPersonal);
    frase += ", retirándose del mismo " + (articulo ? articulo + " " : "personal policial: ")
      + enumerar(personal);
    if (moviles.length) frase += " con " + (moviles.length === 1 ? "Móvil N° " : "Móviles N° ")
      + enumerar(moviles);
  } else if (moviles.length) {
    frase += ", retirándose del mismo " + (moviles.length === 1 ? "el Móvil N° " : "los Móviles N° ")
      + enumerar(moviles);
  }
  if (elementos.length) {
    frase += (personal.length || moviles.length
      ? " y los siguientes Elementos: "
      : ", retirándose del mismo los siguientes Elementos: ") + enumerar(elementos);
  }
  return frase + ". Permanece afectada al operativo la dotación indicada precedentemente.";
}
