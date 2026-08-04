/**
 * Regla funcional específica: Presencia Activa en Puente Carretero.
 * La detección se hace con tipo + nombre + lugar para no afectar otros
 * operativos de Presencia Activa que puedan tener reglas diferentes.
 */
export function esPresenciaActivaPuenteCarretero(operativo = {}, tipoFallback = "") {
  const fuenteTipo = normalizar([
    tipoFallback,
    operativo?.tipo_operativo,
    operativo?.tipo_codigo,
    operativo?.tipo_nombre,
    operativo?.tipo_descripcion,
    operativo?.titulo,
    operativo?.tipo
  ].filter(Boolean).join(" "));

  const fuenteLugar = normalizar([
    operativo?.lugar,
    operativo?.qth,
    operativo?.ubicacion
  ].filter(Boolean).join(" "));

  return fuenteTipo.includes("PRESENCIA ACTIVA") && fuenteLugar.includes("PUENTE CARRETERO");
}

export function hayControladosFinaliza(formulario = {}) {
  return CAMPOS_CONTROLADOS.some((campo) => numero(formulario?.[campo]) > 0);
}

export const CAMPOS_CONTROLADOS = Object.freeze([
  "vehiculos",
  "personas",
  "test_alometro",
  "test_alcoholimetro",
  "positiva_sancionable",
  "positiva_no_sancionable",
  "actas",
  "requisas",
  "qrz",
  "dominio",
  "remision",
  "retencion",
  "prohibicion_circulacion",
  "cesion_conduccion"
]);

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[–—]/g, "-")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numero(valor) {
  const n = Number(valor || 0);
  return Number.isFinite(n) ? n : 0;
}
