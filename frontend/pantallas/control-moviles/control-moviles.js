/**
 * Adaptador del contenedor dinámico.
 * El Control de móviles real se monta por la capa de compatibilidad para
 * conservar exactamente el comportamiento WSP (lista, amarillo, locks y Salir).
 * Este módulo solo evita que el contenedor dinámico duplique la interfaz.
 */
export async function iniciarControlMoviles({ hostSelector } = {}) {
  const host = hostSelector ? document.querySelector(hostSelector) : null;
  if (host) host.innerHTML = "";
  return { ok: true, delegado: "compatibilidad-control-moviles" };
}

export const iniciarModuloControlMoviles = iniciarControlMoviles;
export const renderControlMoviles = iniciarControlMoviles;
