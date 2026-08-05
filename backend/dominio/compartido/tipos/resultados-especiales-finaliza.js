/**
 * Define los operativos cuyo FINALIZA incorpora resultados adicionales
 * ASSAL y Control de Armas. La detección usa tanto el tipo de formulario
 * como la denominación original publicada por Filtro Órdenes.
 */
export function usaResultadosAssalControlArmas(operativo = {}, tipoFallback = "") {
  const fuente = fuenteOperativoNormalizada(operativo, tipoFallback);
  if (!fuente) return false;

  return (
    contieneToken(fuente, "OCV") ||
    fuente.includes("CONTROL VEHICULAR") ||
    contieneToken(fuente, "ALCOHOLEMIA") ||
    contieneToken(fuente, "DICEP") ||
    contieneToken(fuente, "UFIV") ||
    contieneToken(fuente, "MULTIAGENCIA") ||
    contieneToken(fuente, "MULTIAGENCIAL") ||
    contieneToken(fuente, "COORDINADO") ||
    fuente.includes("EN CONJUNTO")
  );
}

function fuenteOperativoNormalizada(operativo = {}, tipoFallback = "") {
  return normalizar([
    tipoFallback,
    operativo?.tipo_operativo,
    operativo?.tipo_codigo,
    operativo?.tipo_nombre,
    operativo?.tipo_original,
    operativo?.tipo_descripcion,
    operativo?.titulo,
    operativo?.tipo,
    operativo?.descripcion,
    operativo?.detalle,
    operativo?.etiqueta,
    operativo?.datos?.tipo_original,
    operativo?.registro_original?.tipo
  ].filter(Boolean).join(" "));
}

function contieneToken(fuente, token) {
  return new RegExp(`(?:^|\\s)${token}(?:\\s|$)`).test(fuente);
}

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[–—_-]+/g, " ")
    .replace(/[^A-Z0-9°/. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
