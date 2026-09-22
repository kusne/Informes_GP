const CANAL_INSTANCIA = "informes-gp-instancia-unica-v3";
const ESPERA_DETECCION_MS = 220;

let canal = null;
let instanciaId = "";
let creadaEn = 0;

/**
 * Detecta si Informes GP ya está abierto en otra pestaña.
 *
 * Regla de seguridad:
 * - La instancia única se aplica sólo entre pestañas de la MISMA versión.
 * - Una pestaña de una versión anterior nunca bloquea una versión nueva.
 * - Entre dos pestañas de la misma versión gana de forma determinística
 *   la más antigua (y, ante empate, el id menor).
 */
export function iniciarInstanciaUnicaInformesGP({
  esperaMs = ESPERA_DETECCION_MS,
  versionActual = ""
} = {}) {
  const version = String(versionActual || "").trim() || "SIN_VERSION";
  try {
    window.name = window.name || "InformesGPPrincipal";
  } catch {}

  if (!("BroadcastChannel" in window)) {
    return Promise.resolve({ activo: false, duplicada: false, motivo: "BroadcastChannel no disponible" });
  }

  instanciaId = crearIdInstancia();
  creadaEn = Date.now();
  canal = new BroadcastChannel(CANAL_INSTANCIA);

  return new Promise((resolve) => {
    let resuelto = false;
    const finalizar = (resultado) => {
      if (resuelto) return;
      resuelto = true;
      resolve(resultado);
    };

    canal.addEventListener("message", (event) => {
      const mensaje = event?.data || {};
      if (!mensaje || mensaje.instanciaId === instanciaId) return;

      if (mensaje.tipo === "IGP_BUSCAR_INSTANCIA") {
        const versionSolicitante = String(mensaje.version || "").trim();
        if (versionSolicitante !== version) return;
        if (!estaInstanciaTienePrioridadSobre(mensaje)) return;

        try { window.focus(); } catch {}
        canal.postMessage({
          tipo: "IGP_INSTANCIA_PRESENTE",
          instanciaId,
          creadaEn,
          version,
          para: mensaje.instanciaId,
          visible: document.visibilityState === "visible"
        });
        return;
      }

      if (mensaje.tipo === "IGP_INSTANCIA_PRESENTE" && mensaje.para === instanciaId) {
        const versionExistente = String(mensaje.version || "").trim();
        if (versionExistente !== version) return;

        console.info("[Informes_GP] Instancia previa de la misma versión detectada; la nueva pestaña no iniciará otra copia de la app.");
        finalizar({
          activo: true,
          duplicada: true,
          instanciaId,
          instanciaExistenteId: mensaje.instanciaId
        });

        setTimeout(() => {
          try { window.close(); } catch {}
        }, 80);
      }
    });

    canal.postMessage({ tipo: "IGP_BUSCAR_INSTANCIA", instanciaId, creadaEn, version });

    setTimeout(() => {
      finalizar({ activo: true, duplicada: false, instanciaId });
    }, Math.max(80, Number(esperaMs) || ESPERA_DETECCION_MS));

    window.addEventListener("pagehide", cerrarCanal, { once: true });
  });
}

function estaInstanciaTienePrioridadSobre(mensaje = {}) {
  const otraCreadaEn = Number(mensaje.creadaEn || 0);
  if (!otraCreadaEn) return true;
  if (creadaEn < otraCreadaEn) return true;
  if (creadaEn > otraCreadaEn) return false;
  return String(instanciaId) < String(mensaje.instanciaId || "");
}

function cerrarCanal() {
  try { canal?.close(); } catch {}
  canal = null;
}

function crearIdInstancia() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
