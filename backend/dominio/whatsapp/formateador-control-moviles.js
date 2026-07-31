export function obtenerSalidaControlMovilesDesdeEstado(estado = {}) {
  return {
    texto: estado.controlMovilesTexto || "",
    errores: Array.isArray(estado.controlMovilesErrores) ? estado.controlMovilesErrores : [],
    payload: estado.controlMovilesSupabasePayload || null
  };
}