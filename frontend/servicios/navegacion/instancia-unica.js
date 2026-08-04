const CANAL_INSTANCIA = "informes-gp-instancia-unica-v1";

let canal = null;
let instanciaId = "";
let takeoverSolicitado = false;

/**
 * Coordinación best-effort entre pestañas del mismo navegador.
 * Una página web normal no tiene permiso universal para cerrar pestañas que
 * abrió el usuario. Cuando el navegador lo permite, las instancias anteriores
 * ocultas se cierran; en los demás casos quedan inactivas. Para una única
 * ventana garantizada se usa el modo PWA con launch_handler.
 */
export function iniciarInstanciaUnicaInformesGP() {
  try {
    window.name = window.name || "InformesGPPrincipal";
  } catch {}

  if (!("BroadcastChannel" in window)) {
    return { activo: false, motivo: "BroadcastChannel no disponible" };
  }

  instanciaId = crearIdInstancia();
  canal = new BroadcastChannel(CANAL_INSTANCIA);

  canal.addEventListener("message", (event) => {
    const mensaje = event?.data || {};
    if (!mensaje || mensaje.instanciaId === instanciaId) return;

    if (mensaje.tipo === "IGP_BUSCAR_INSTANCIA") {
      canal.postMessage({
        tipo: "IGP_INSTANCIA_PRESENTE",
        instanciaId,
        para: mensaje.instanciaId,
        visible: document.visibilityState === "visible"
      });
      return;
    }

    if (mensaje.tipo === "IGP_INSTANCIA_PRESENTE" && mensaje.para === instanciaId) {
      if (takeoverSolicitado) return;
      takeoverSolicitado = true;

      // La pestaña recién abierta queda como principal; las anteriores intentan
      // cerrarse únicamente si están ocultas.
      canal.postMessage({
        tipo: "IGP_TOMAR_CONTROL",
        instanciaId
      });
      return;
    }

    if (mensaje.tipo === "IGP_TOMAR_CONTROL") {
      desactivarInstanciaAnterior();
    }
  });

  canal.postMessage({
    tipo: "IGP_BUSCAR_INSTANCIA",
    instanciaId
  });

  window.addEventListener("pagehide", cerrarCanal, { once: true });

  return { activo: true, instanciaId };
}

function desactivarInstanciaAnterior() {
  if (document.visibilityState !== "hidden") return;

  // Evita que una pestaña vieja siga manteniendo conexiones realtime aunque
  // el navegador no permita cerrarla.
  window.dispatchEvent(new CustomEvent("informesgp:instancia-reemplazada"));

  try {
    window.close();
  } catch {}
}

function cerrarCanal() {
  try {
    canal?.close();
  } catch {}
  canal = null;
}

function crearIdInstancia() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
