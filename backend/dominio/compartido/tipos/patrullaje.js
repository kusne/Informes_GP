/** Detecta operativos de patrullaje sin depender de mayúsculas, acentos o guiones. */
export function esOperativoPatrullaje(operativo = {}, tipoFallback = "") {
  const fuente = normalizar([
    tipoFallback,
    operativo?.tipo_operativo,
    operativo?.tipo_codigo,
    operativo?.tipo_nombre,
    operativo?.tipo_descripcion,
    operativo?.titulo,
    operativo?.tipo
  ].filter(Boolean).join(" "));

  return fuente.includes("PATRULLAJE");
}

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[–—_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
