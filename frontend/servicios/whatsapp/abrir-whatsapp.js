import {
  WHATSAPP_CONFIG,
  obtenerTelefonoWhatsappDestino,
  normalizarTelefonoWhatsapp
} from "../../../backend/dominio/whatsapp/whatsapp-config.js";

const NOMBRE_VENTANA_WHATSAPP = "InformesGPWhatsApp";

/**
 * Debe llamarse directamente dentro del gesto del usuario (click), antes de
 * cualquier await. Así los navegadores móviles no consideran la apertura como
 * un popup tardío y la aplicación principal nunca se reemplaza por WhatsApp.
 */
export function prepararVentanaWhatsapp() {
  try {
    return window.open("about:blank", NOMBRE_VENTANA_WHATSAPP);
  } catch (error) {
    console.warn("[Informes_GP] El navegador bloqueó la preparación de WhatsApp.", error);
    return null;
  }
}

export function cerrarVentanaWhatsappPreparada(ventana) {
  if (!ventana) return;

  try {
    if (!ventana.closed) {
      ventana.close();
    }
  } catch {}
}

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
    nuevaPestana: opciones.nuevaPestana ?? WHATSAPP_CONFIG.abrirEnNuevaPestana,
    ventanaPreparada: opciones.ventanaPreparada || null
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
  nuevaPestana = true,
  ventanaPreparada = null
} = {}) {
  const enlace = String(url || "").trim();

  if (!enlace) {
    throw new Error("No se pudo construir el enlace de WhatsApp.");
  }

  if (!nuevaPestana) {
    throw new Error("WhatsApp debe abrirse fuera de la ventana de Informes GP.");
  }

  let ventana = ventanaPreparada;

  if (!ventana || ventana.closed) {
    try {
      ventana = window.open("about:blank", NOMBRE_VENTANA_WHATSAPP);
    } catch {
      ventana = null;
    }
  }

  if (!ventana) {
    throw new Error(
      "El navegador bloqueó la apertura de WhatsApp. Habilite ventanas emergentes para Informes GP y vuelva a tocar Enviar por WhatsApp."
    );
  }

  try {
    ventana.opener = null;
  } catch {}

  try {
    ventana.location.replace(enlace);
  } catch {
    try {
      ventana.location.href = enlace;
    } catch (error) {
      cerrarVentanaWhatsappPreparada(ventana);
      throw new Error("No se pudo abrir WhatsApp sin cerrar Informes GP.");
    }
  }

  try {
    ventana.focus();
  } catch {}

  return enlace;
}
