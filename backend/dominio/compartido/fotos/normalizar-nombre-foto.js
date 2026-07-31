export function normalizarNombreFoto({
  archivo,
  prefijo = "foto",
  indice = 1,
  contexto = {}
} = {}) {
  const guardiaFecha = String(
    contexto?.guardia_fecha ||
    contexto?.guardiaFecha ||
    window.InformesGP?.guardiaFecha ||
    "sin_guardia"
  ).trim();

  const operativoKey = String(
    contexto?.operativoSeleccionado?.operativo_key ||
    contexto?.operativo_key ||
    "sin_operativo"
  ).trim();

  const extension = obtenerExtension(archivo?.name || "jpg");

  return [
    limpiar(prefijo),
    limpiar(guardiaFecha),
    limpiar(operativoKey),
    `foto_${indice}`
  ]
    .filter(Boolean)
    .join("_") + `.${extension}`;
}

function obtenerExtension(nombre) {
  const partes = String(nombre || "").split(".");
  const ext = partes.length > 1 ? partes.pop() : "jpg";

  return String(ext || "jpg")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") || "jpg";
}

function limpiar(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}