import {
  WHATSAPP_CONFIG
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

  const destinos = construirDestinosWhatsapp({ texto: mensaje });

  return abrirUrlWhatsapp(destinos, {
    nuevaPestana: opciones.nuevaPestana ?? WHATSAPP_CONFIG.abrirEnNuevaPestana,
    ventanaPreparada: opciones.ventanaPreparada || null
  });
}

export function construirUrlWhatsapp({ texto } = {}) {
  const mensaje = String(texto || "").trim();
  if (!mensaje) throw new Error("No hay texto para construir enlace de WhatsApp.");

  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}

export function construirDestinosWhatsapp({ texto } = {}) {
  return {
    app: "",
    web: construirUrlWhatsapp({ texto })
  };
}

export function abrirUrlWhatsapp(destinos, {
  nuevaPestana = true,
  ventanaPreparada = null
} = {}) {
  const { web } = normalizarDestinos(destinos);

  if (!web) throw new Error("No se pudo construir el enlace de WhatsApp.");

  if (!nuevaPestana) {
    window.location.href = web;
    return web;
  }

  let ventana = ventanaPreparada;

  if (!ventana || ventana.closed) {
    try {
      ventana = window.open(web, "_blank");
      if (ventana) return web;
    } catch (error) {
      console.warn(
        "[Informes_GP] No se pudo abrir WhatsApp en ventana nueva. Se usa navegación actual.",
        error
      );
    }

    window.location.href = web;
    return web;
  }

  try { ventana.opener = null; } catch {}

  try {
    ventana.location.href = web;
  } catch (error) {
    cerrarVentanaWhatsappPreparada(ventana);
    window.location.href = web;
    return web;
  }

  try { ventana.focus(); } catch {}

  return web;
}

function normalizarDestinos(valor) {
  if (typeof valor === "string") {
    return { web: valor.trim() };
  }

  return {
    web: String(valor?.web || "").trim()
  };
}
