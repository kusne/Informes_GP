export function obtenerSalidaInformesDesdeEstado(estado = {}) {
  return {
    texto: estado.informeTexto || estado.informeEspecialTexto || "",
    errores: Array.isArray(estado.informeErrores) ? estado.informeErrores : [],
    payload: estado.informeEspecialSupabasePayload || null
  };
}