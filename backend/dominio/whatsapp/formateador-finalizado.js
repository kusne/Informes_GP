export function obtenerSalidaFinalizadoDesdeEstado(estado = {}) {
  return {
    texto: estado.finalizadoTexto || "",
    errores: Array.isArray(estado.finalizadoErrores) ? estado.finalizadoErrores : [],
    payload: estado.finalizadoSupabasePayload || null
  };
}