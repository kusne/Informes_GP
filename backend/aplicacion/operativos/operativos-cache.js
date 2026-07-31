const cacheOperativos = new Map();

export function generarClaveCacheOperativos({ modo, guardiaFecha }) {
  return `${modo || "SIN_MODO"}::${guardiaFecha || "SIN_GUARDIA"}`;
}

export function guardarOperativosEnCache({ modo, guardiaFecha, operativos }) {
  const clave = generarClaveCacheOperativos({ modo, guardiaFecha });
  cacheOperativos.set(clave, Array.isArray(operativos) ? [...operativos] : []);
}

export function obtenerOperativosDesdeCache({ modo, guardiaFecha }) {
  const clave = generarClaveCacheOperativos({ modo, guardiaFecha });
  const datos = cacheOperativos.get(clave);
  return Array.isArray(datos) ? [...datos] : [];
}

export function limpiarCacheOperativos() {
  cacheOperativos.clear();
}
