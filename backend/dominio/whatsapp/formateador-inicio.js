export function obtenerSalidaInicioDesdeEstado(estado = {}) {
  return {
    texto: estado.inicioTexto || "",
    errores: Array.isArray(estado.inicioErrores) ? estado.inicioErrores : [],
    payload: estado.inicioSupabasePayload || null
  };
}