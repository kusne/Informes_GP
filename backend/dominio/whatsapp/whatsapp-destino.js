import { obtenerTelefonoWhatsappDestino } from "./whatsapp-config.js";

export function obtenerResumenDestinoWhatsapp() {
  const telefono = obtenerTelefonoWhatsappDestino();

  if (!telefono) {
    return "Destino manual: WhatsApp abrirá el selector/contacto.";
  }

  return `Destino configurado: ${telefono}`;
}