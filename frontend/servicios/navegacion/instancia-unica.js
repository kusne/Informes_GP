const CANAL_INSTANCIA = "informes-gp-instancia-unica-v2";

let canal = null;
let instanciaId = "";

/**
 * Coordinación informativa entre pestañas del mismo navegador.
 *
 * IMPORTANTE:
 * Informes GP nunca debe cerrar, reemplazar ni desactivar una ventana que el
 * usuario ya tiene abierta. Versiones anteriores intentaban hacer takeover de
 * la instancia anterior y cerraban programáticamente la pestaña cuando estaba oculta; en
 * móviles/PWA eso podía provocar cierres inesperados o pérdida del formulario.
 *
 * La coordinación queda sólo para detectar que existe otra instancia. Cada
 * pestaña conserva su ciclo de vida normal y el navegador decide cuándo cerrar.
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
      console.info("[Informes_GP] Hay otra instancia abierta. Se mantienen ambas sin cerrar ninguna ventana.");
    }
  });

  canal.postMessage({
    tipo: "IGP_BUSCAR_INSTANCIA",
    instanciaId
  });

  window.addEventListener("pagehide", cerrarCanal, { once: true });

  return { activo: true, instanciaId };
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
