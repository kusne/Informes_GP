import { buscarNumeral } from "./nomenclador.js";

export function clasificarItemsNumerales(items = []) {
  return items.map((item) => {
    const info = item.codigo ? buscarNumeral(item.codigo) : null;

    return {
      ...item,
      descripcion: info?.descripcion || item.detalle || "SIN DESCRIPCIÓN",
      categoria: info?.categoria || resolverCategoriaFallback(item)
    };
  });
}

function resolverCategoriaFallback(item) {
  if (!item.codigo) return "OBSERVACION";
  return "OTROS";
}
