export const WHATSAPP_CONFIG = {
  telefonoDestino: "",
  abrirEnNuevaPestana: true
};

export function obtenerTelefonoWhatsappDestino(valor = "") {
  return normalizarTelefonoWhatsapp(valor || WHATSAPP_CONFIG.telefonoDestino);
}

export function normalizarTelefonoWhatsapp(valor) {
  return String(valor || "").replace(/[^\d]/g, "").trim();
}
