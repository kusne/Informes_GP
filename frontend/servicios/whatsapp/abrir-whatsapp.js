import {
  WHATSAPP_CONFIG,
  obtenerTelefonoWhatsappDestino,
  normalizarTelefonoWhatsapp
} from "../../../backend/dominio/whatsapp/whatsapp-config.js";

export function abrirWhatsappConTexto(texto, opciones = {}) {
  const mensaje = String(texto || "").trim();

  if (!mensaje) {
    throw new Error("No hay texto para enviar por WhatsApp.");
  }

  const telefono = normalizarTelefonoWhatsapp(
    opciones.telefono ||
    opciones.telefonoDestino ||
    obtenerTelefonoWhatsappDestino()
  );

  const url = construirUrlWhatsapp({
    texto: mensaje,
    telefono
  });

  return abrirUrlWhatsapp(url, {
    nuevaPestana: opciones.nuevaPestana ?? WHATSAPP_CONFIG.abrirEnNuevaPestana
  });
}

export function construirUrlWhatsapp({
  texto,
  telefono = ""
} = {}) {
  const mensaje = String(texto || "").trim();

  if (!mensaje) {
    throw new Error("No hay texto para construir enlace de WhatsApp.");
  }

  const telefonoLimpio = normalizarTelefonoWhatsapp(telefono);
  const encoded = encodeURIComponent(mensaje);

  if (telefonoLimpio) {
    return `https://wa.me/${telefonoLimpio}?text=${encoded}`;
  }

  return `https://wa.me/?text=${encoded}`;
}

export function abrirUrlWhatsapp(url, {
  nuevaPestana = true
} = {}) {
  const enlace = String(url || "").trim();

  if (!enlace) {
    throw new Error("No se pudo construir el enlace de WhatsApp.");
  }

  let ventana = null;

  if (nuevaPestana) {
    ventana = window.open(enlace, "_blank", "noopener,noreferrer");
  }

  if (!ventana) {
    window.location.href = enlace;
  }

  return enlace;
}