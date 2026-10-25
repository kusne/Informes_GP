/**
 * Intérprete del único campo visible «Licencia / DNI».
 * Catálogo de clases suministrado por la Brigada Motorizada.
 *
 * Ejemplos:
 *   B2 27762328                 -> [B2], DNI 27762328
 *   A1.1, A1.3 y B2 27762328    -> [A1.1,A1.3,B2], DNI 27762328
 *   27762328                    -> DNI sin clase declarada
 *
 * Ni la presencia de ocho dígitos ni una clase adicional deben crear
 * infracciones por «no posee licencia». Este módulo es puro y compartido
 * entre la UI, el texto institucional, las validaciones y los numerales.
 */
export const CLASES_LICENCIA_PERMITIDAS = Object.freeze([
  "A1.1", "A1.2", "A1.3", "A1.4", "A2.1", "A2.2", "A3",
  "B1", "B2", "C1", "C2", "C3", "D1", "D2", "D3", "D4",
  "E1", "E2", "E3", "F", "G1", "G2", "G3"
]);
const VALIDAS = new Set(CLASES_LICENCIA_PERMITIDAS);
const SIN_DATO = Object.freeze({
  tipo: "VACIO", clase: "", clases: Object.freeze([]),
  dni: "", dniFormateado: "", valido: false
});

function dniPresentacion(numero) {
  return numero ? numero.replace(/^(\d{2})(\d{3})(\d{3})$/, "$1.$2.$3") : "";
}

function resultado(tipo, clases, dni, valido) {
  const copia = Object.freeze([...clases]);
  return {
    tipo, clase: copia[0] || "", clases: copia,
    dni, dniFormateado: dniPresentacion(dni), valido
  };
}

export function interpretarLicenciaDniAlcoholemia(valor) {
  let entrada = String(valor ?? "").trim().toLocaleUpperCase("es-AR")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!entrada) return { ...SIN_DATO };

  // Sacar el DNI solo si constituye el dato aislado o aparece claramente
  // separado al final de las clases. Se admiten 27762328 y 27.762.328.
  let dni = "";
  const coincidencia = entrada.match(
    /(?:^|[\s,;\/+])(?:D\.?N\.?I\.?\s*(?:N[°º.]?\s*)?|N(?:[°º.]|RO\.?|UMERO)?\s*)?(\d{8}|\d{2}[.]\d{3}[.]\d{3})\s*$/
  );
  if (coincidencia) {
    dni = coincidencia[1].replace(/\D/g, "");
    entrada = entrada.slice(0, coincidencia.index).trim();
  } else if (/^(?:D\.?N\.?I\.?)?\s*\d{2}[.]?\d{3}[.]?\d{3}$/.test(entrada)) {
    dni = entrada.replace(/\D/g, "");
    entrada = "";
  }

  if (!entrada) return dni ? resultado("DNI", [], dni, true) : resultado("INVALIDO", [], "", false);

  // «CLASES A 1.1, A1.3 Y B 2», «A1.1/B2/G3», «F y B1».
  // El espacio entre letra y subclase se normaliza antes de tokenizar.
  entrada = entrada.replace(/\bCLASES?\s*[:\-]?\s*/g, "")
    .replace(/\b([A-G])\s+(?=\d)/g, "$1")
    .replace(/\s+Y\s+/g, ",")
    .replace(/[;\/+]/g, ",");
  const tokens = entrada.split(/[\s,]+/).filter(Boolean).map(v => v.replace(/,/g, "."));
  if (!tokens.length || tokens.some(c => !VALIDAS.has(c))) {
    return resultado("INVALIDO", [], dni, false);
  }

  // Deduplicar y conservar orden de ingreso sin perder clases informadas.
  const clases = [...new Set(tokens)];
  return resultado("LICENCIA", clases, dni, true);
}
