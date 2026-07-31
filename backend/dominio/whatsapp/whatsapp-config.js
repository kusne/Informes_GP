export const WHATSAPP_CONFIG = {
  // Dejar vacío para abrir WhatsApp con selector/contacto manual.
  // Si más adelante querés destino fijo, usar formato internacional sin +.
  // Ejemplo Argentina: 5493420000000
  telefonoDestino: "",

  // true = abre en pestaña nueva cuando el navegador lo permite.
  abrirEnNuevaPestana: true
};

export function obtenerTelefonoWhatsappDestino() {
  const desdeWindow =
    window.InformesGP?.whatsapp?.telefonoDestino ||
    window.WHATSAPP_TELEFONO_DESTINO ||
    "";

  return normalizarTelefonoWhatsapp(desdeWindow || WHATSAPP_CONFIG.telefonoDestino);
}

export function normalizarTelefonoWhatsapp(valor) {
  return String(valor || "")
    .replace(/[^\d]/g, "")
    .trim();
}