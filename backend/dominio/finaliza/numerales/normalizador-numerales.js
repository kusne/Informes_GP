export function normalizarTextoNumerales(texto) {
  return String(texto || "")
    .replace(/\r/g, "\n")
    .replace(/[;,]+/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export function extraerItemsNumerales(texto) {
  const normalizado = normalizarTextoNumerales(texto);

  if (!normalizado) return [];

  const lineas = normalizado
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);

  const items = [];

  for (const linea of lineas) {
    const item = extraerItemDesdeLinea(linea);

    if (item) {
      items.push(item);
    }
  }

  return items;
}

function extraerItemDesdeLinea(linea) {
  const texto = String(linea || "").trim();

  if (!texto) return null;

  const match = texto.match(/^(\d{3,5})(?:\s+|x|\*)(\d+)?\s*(.*)$/i);

  if (match) {
    const codigo = match[1];
    const cantidad = Number(match[2] || 1);
    const detalle = String(match[3] || "").trim();

    return {
      codigo,
      cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 1,
      detalle,
      origen: texto
    };
  }

  const matchCodigoSolo = texto.match(/^(\d{3,5})$/);

  if (matchCodigoSolo) {
    return {
      codigo: matchCodigoSolo[1],
      cantidad: 1,
      detalle: "",
      origen: texto
    };
  }

  return {
    codigo: "",
    cantidad: 1,
    detalle: texto,
    origen: texto
  };
}
