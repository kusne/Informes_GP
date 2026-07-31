const MAX_FOTOS_DEFAULT = 4;
const MAX_MB_DEFAULT = 12;

export function validarCantidadFotos(fotos = [], max = MAX_FOTOS_DEFAULT) {
  const cantidad = Array.isArray(fotos) ? fotos.length : 0;

  if (cantidad >= max) {
    throw new Error(`Solo se permiten hasta ${max} fotos.`);
  }

  return true;
}

export function validarFotoArchivo(archivo, { maxMb = MAX_MB_DEFAULT } = {}) {
  if (!archivo) {
    throw new Error("No se seleccionó ninguna foto.");
  }

  if (!String(archivo.type || "").startsWith("image/")) {
    throw new Error("El archivo seleccionado debe ser una imagen.");
  }

  const maxBytes = maxMb * 1024 * 1024;

  if (Number(archivo.size || 0) > maxBytes) {
    throw new Error(`La foto supera el máximo permitido de ${maxMb} MB.`);
  }

  return true;
}