import { normalizarTexto } from "./normalizar-texto.js";

export function limpiarObservaciones(valor) {
  const texto = normalizarTexto(valor);

  if (!texto) return "";

  return texto
    .replace(/\bOBSERVACIONES?\s*:\s*/gi, "")
    .replace(/\bOBS\.?\s*:\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function unirObservaciones(...partes) {
  return partes
    .map(limpiarObservaciones)
    .filter(Boolean)
    .join(" - ");
}
