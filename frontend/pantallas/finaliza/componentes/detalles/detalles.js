import { getReferenciaFalta } from "../../../../../backend/dominio/finaliza/numerales/nomenclador.js";

export function iniciarDetallesFinaliza({ textarea, onChange } = {}) {
  if (!textarea || textarea.dataset.detallesNomencladorIniciado === "1") return;
  textarea.dataset.detallesNomencladorIniciado = "1";

  const aplicar = () => {
    aplicarAutocompletadoDetalles(textarea);
    onChange?.(textarea.value);
  };

  // Mismo comportamiento de WSP histórico: completa mientras se escribe y al perder foco.
  textarea.addEventListener("input", aplicar);
  textarea.addEventListener("blur", aplicar);
}

export function aplicarAutocompletadoDetalles(textarea) {
  if (!textarea) return;
  const original = String(textarea.value || "");
  const nuevo = autocompletarDetallesDesdeNomenclador(original);
  if (nuevo === original) return;

  const inicio = typeof textarea.selectionStart === "number" ? textarea.selectionStart : original.length;
  const fin = typeof textarea.selectionEnd === "number" ? textarea.selectionEnd : original.length;
  const nuevoInicio = autocompletarDetallesDesdeNomenclador(original.slice(0, inicio)).length;
  const nuevoFin = autocompletarDetallesDesdeNomenclador(original.slice(0, fin)).length;
  textarea.value = nuevo;
  try { textarea.setSelectionRange(nuevoInicio, nuevoFin); } catch {}
}

export function autocompletarDetallesDesdeNomenclador(texto) {
  const original = String(texto || "").replace(/\r/g, "");
  if (!original) return original;
  return original.split("\n").map(autocompletarLineaDetalleConNomenclador).join("\n");
}

export function autocompletarLineaDetalleConNomenclador(linea) {
  const original = String(linea || "").replace(/\r/g, "");
  const s = original.trim();
  if (!s) return original;

  const patrones = [
    { regex: /^\(\s*(\d{1,2})\s*\)\s*(\d{4,5})(?:\s*[-:;,.–—]\s*|\s+)?(.*)$/i, conCantidad: true },
    { regex: /^(\d{1,2})\s*[-–—]\s*(\d{4,5})(?:\s*[-:;,.–—]\s*|\s+)?(.*)$/i, conCantidad: true },
    { regex: /^(\d{1,2})\s+(\d{4,5})(?:\s*[-:;,.–—]\s*|\s+)?(.*)$/i, conCantidad: true },
    { regex: /^(\d{4,5})(?:\s*[-:;,.–—]\s*|\s+)?(.*)$/i, conCantidad: false }
  ];

  for (const patron of patrones) {
    const m = s.match(patron.regex);
    if (!m) continue;
    const cantidad = patron.conCantidad ? m[1] : null;
    const codigo = patron.conCantidad ? m[2] : m[1];

    // Regla histórica de WSP: 17117 se deja manual por su ambigüedad operativa.
    if (String(codigo || "").replace(/\D+/g, "") === "17117") return original;

    const referencia = String(getReferenciaFalta(codigo, "") || "").trim();
    if (!referencia) return original;
    return reconstruirLineaDetalle(cantidad, codigo, referencia) || original;
  }
  return original;
}

export function reconstruirLineaDetalle(cantidad, codigo, descripcion) {
  const desc = limpiarDescripcionDetalle(descripcion);
  if (!desc) return null;
  const cod = String(codigo || "").replace(/\D+/g, "");
  if (!cod) return null;
  if (cantidad == null || cantidad === "") return `${cod} ${desc}`;
  return `(${formatearCantidad(cantidad)}) ${cod} ${desc}`;
}

function limpiarDescripcionDetalle(txt) {
  return String(txt || "")
    .replace(/^[\s:;,.–—-]+/, "")
    .replace(/\s*[:;,.–—-]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function formatearCantidad(v) {
  const n = Math.max(0, parseInt(String(v || "0"), 10) || 0);
  return String(n).padStart(2, "0");
}
