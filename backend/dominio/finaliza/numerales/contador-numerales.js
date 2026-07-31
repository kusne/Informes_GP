export function consolidarItemsNumerales(items = []) {
  const mapa = new Map();

  for (const item of items) {
    const codigo = String(item.codigo || "").trim();
    const detalle = String(item.detalle || "").trim();
    const key = codigo || `SIN_CODIGO::${detalle.toUpperCase()}`;

    if (!mapa.has(key)) {
      mapa.set(key, {
        codigo,
        cantidad: 0,
        detalle,
        origenes: []
      });
    }

    const actual = mapa.get(key);
    actual.cantidad += Number(item.cantidad || 1);
    actual.origenes.push(item.origen || "");
  }

  return [...mapa.values()];
}

export function contarTotalNumerales(items = []) {
  return items.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
}
