import {
  WHATSAPP_CONFIG,
  obtenerTelefonoWhatsappDestino,
  normalizarTelefonoWhatsapp
} from "../../../api/app-api.js";

const NOMBRE_VENTANA_WHATSAPP = "InformesGPWhatsApp";

/**
 * Debe llamarse directamente dentro del gesto del usuario (click), antes de
 * cualquier await. La pestaña preparada se reutiliza para abrir WhatsApp sin
 * reemplazar la ventana principal de Informes GP.
 */
export function prepararVentanaWhatsapp() {
  try {
    const ventana = window.open("about:blank", NOMBRE_VENTANA_WHATSAPP);

    if (ventana) {
      try {
        ventana.document.title = "Abriendo WhatsApp…";
        ventana.document.body.innerHTML = `
          <main style="font-family:system-ui,sans-serif;padding:24px;line-height:1.4">
            <strong>Preparando WhatsApp…</strong>
          </main>
        `;
      } catch {}
    }

    return ventana;
  } catch (error) {
    console.warn("[Informes_GP] El navegador bloqueó la preparación de WhatsApp.", error);
    return null;
  }
}

export function cerrarVentanaWhatsappPreparada(ventana) {
  if (!ventana) return;

  try {
    if (!ventana.closed) ventana.close();
  } catch {}
}

export function puedeCompartirArchivosDesdeDispositivo(archivos = []) {
  const files = normalizarArchivosCompartibles(archivos);

  if (!files.length || typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }

  if (typeof navigator.canShare === "function") {
    try {
      return navigator.canShare({ files });
    } catch {
      return false;
    }
  }

  return true;
}

export function compartirInformeConArchivos({ texto, archivos = [] } = {}) {
  const mensaje = String(texto || "").trim();
  const files = normalizarArchivosCompartibles(archivos);

  if (!mensaje) throw new Error("No hay texto para enviar por WhatsApp.");
  if (!files.length) throw new Error("No hay fotos disponibles para adjuntar.");

  if (!puedeCompartirArchivosDesdeDispositivo(files)) {
    throw new Error(
      "Este navegador no permite adjuntar las fotos directamente. Abra Informes GP desde Chrome/Android o desde la app instalada y vuelva a intentar."
    );
  }

  return navigator.share({
    title: "Informe BMZCN",
    text: mensaje,
    files
  });
}

function normalizarArchivosCompartibles(archivos = []) {
  if (!Array.isArray(archivos)) return [];

  return archivos
    .map((archivo, indice) => {
      if (!archivo) return null;

      if (typeof File !== "undefined" && archivo instanceof File) return archivo;

      if (typeof Blob !== "undefined" && archivo instanceof Blob && typeof File !== "undefined") {
        return new File(
          [archivo],
          `foto_${indice + 1}.jpg`,
          { type: archivo.type || "image/jpeg" }
        );
      }

      return null;
    })
    .filter(Boolean);
}

export function abrirWhatsappConTexto(texto, opciones = {}) {
  const mensaje = String(texto || "").trim();
  if (!mensaje) throw new Error("No hay texto para enviar por WhatsApp.");

  const telefono = normalizarTelefonoWhatsapp(
    opciones.telefono ||
    opciones.telefonoDestino ||
    obtenerTelefonoWhatsappDestino()
  );

  const destinos = construirDestinosWhatsapp({ texto: mensaje, telefono });

  return abrirUrlWhatsapp(destinos, {
    nuevaPestana: opciones.nuevaPestana ?? WHATSAPP_CONFIG.abrirEnNuevaPestana,
    ventanaPreparada: opciones.ventanaPreparada || null
  });
}

export function construirUrlWhatsapp({ texto, telefono = "" } = {}) {
  return construirDestinosWhatsapp({ texto, telefono }).web;
}

export function construirDestinosWhatsapp({ texto, telefono = "" } = {}) {
  const mensaje = String(texto || "").trim();
  if (!mensaje) throw new Error("No hay texto para construir enlace de WhatsApp.");

  const telefonoLimpio = normalizarTelefonoWhatsapp(telefono);
  const encoded = encodeURIComponent(mensaje);
  const queryTelefono = telefonoLimpio ? `phone=${telefonoLimpio}&` : "";

  return {
    // En teléfonos se prioriza el esquema nativo. Evita pasar por wa.me y por
    // la página web que a veces ofrece instalar WhatsApp aunque ya esté instalado.
    app: `whatsapp://send?${queryTelefono}text=${encoded}`,
    web: telefonoLimpio
      ? `https://wa.me/${telefonoLimpio}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`
  };
}

export function abrirUrlWhatsapp(destinos, {
  nuevaPestana = true,
  ventanaPreparada = null
} = {}) {
  const { app, web } = normalizarDestinos(destinos);

  if (!app && !web) throw new Error("No se pudo construir el enlace de WhatsApp.");
  if (!nuevaPestana) throw new Error("WhatsApp debe abrirse fuera de la ventana de Informes GP.");

  let ventana = ventanaPreparada;

  if (!ventana || ventana.closed) {
    try {
      ventana = window.open("about:blank", NOMBRE_VENTANA_WHATSAPP);
    } catch {
      ventana = null;
    }
  }

  if (!ventana) {
    // Última contingencia móvil: intentar el esquema nativo en la misma pestaña.
    // Si WhatsApp está instalado el sistema operativo abre la app y conserva la
    // PWA en el historial/tarea. No se usa wa.me aquí para no mandar al usuario
    // a la página de instalación.
    if (esDispositivoMovil() && app) {
      window.location.href = app;
      return app;
    }

    throw new Error(
      "El navegador bloqueó la apertura de WhatsApp. Habilite ventanas emergentes para Informes GP y vuelva a tocar Enviar por WhatsApp."
    );
  }

  try { ventana.opener = null; } catch {}

  const destinoPreferido = esDispositivoMovil() && app ? app : web || app;

  try {
    ventana.location.href = destinoPreferido;
  } catch (error) {
    cerrarVentanaWhatsappPreparada(ventana);
    throw new Error("No se pudo abrir WhatsApp sin cerrar Informes GP.");
  }

  try { ventana.focus(); } catch {}

  return destinoPreferido;
}

function normalizarDestinos(valor) {
  if (typeof valor === "string") {
    const enlace = valor.trim();
    return { app: "", web: enlace };
  }

  return {
    app: String(valor?.app || "").trim(),
    web: String(valor?.web || "").trim()
  };
}

function esDispositivoMovil() {
  if (typeof navigator === "undefined") return false;
  const ua = String(navigator.userAgent || "").toLowerCase();
  return /android|iphone|ipad|ipod|mobile/.test(ua);
}
