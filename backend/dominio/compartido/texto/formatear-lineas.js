export function compactarLineas(lineas = []) {
  return lineas
    .map((linea) => String(linea || "").trim())
    .filter(Boolean);
}

export function unirLineas(lineas = []) {
  return compactarLineas(lineas).join("\n");
}

export function agregarLineaSiHayValor(lineas, etiqueta, valor) {
  const texto = String(valor || "").trim();

  if (texto) {
    lineas.push(`${etiqueta}: ${texto}`);
  }

  return lineas;
}

export function agregarLineaNumericaSiMayorACero(lineas, etiqueta, valor) {
  const n = Number(valor || 0);

  if (Number.isFinite(n) && n > 0) {
    lineas.push(`${etiqueta}: ${n}`);
  }

  return lineas;
}
