export function normalizarTexto(valor) {
  return String(valor || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizarTextoMayusculas(valor) {
  return normalizarTexto(valor).toUpperCase();
}

export function quitarAcentos(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizarClaveTexto(valor) {
  return quitarAcentos(valor)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
