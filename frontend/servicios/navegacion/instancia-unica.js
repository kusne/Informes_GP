const CANAL_INSTANCIA = "informes-gp-instancia-unica-v3";
const ESPERA_DETECCION_MS = 220;

let canal = null;
let instanciaId = "";

/**
 * Detecta si Informes GP ya está abierto en otra pestaña.
 *
 * Regla de seguridad:
 * - NUNCA se cierra ni reemplaza la instancia que ya estaba trabajando.
 * - Sólo la pestaña nueva, después de confirmar que existe una anterior,
 *   intenta cerrarse a sí misma. Si Chrome no permite cerrarla, queda en modo
 *   liviano y el bootstrap no inicia una segunda copia de la aplicación.
 */
export function iniciarInstanciaUnicaInformesGP({ esperaMs = ESPERA_DETECCION_MS } = {}) {
  try {
    window.name = window.name || "InformesGPPrincipal";
  } catch {}

  if (!("BroadcastChannel" in window)) {
    return Promise.resolve({ activo: false, duplicada: false, motivo: "BroadcastChannel no disponible" });
  }

  instanciaId = crearIdInstancia();
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
        // La instancia anterior se conserva. Intentamos traerla al frente, pero
        // la decisión final depende de Chrome/Android.
        try { window.focus(); } catch {}
        canal.postMessage({
          tipo: "IGP_INSTANCIA_PRESENTE",
          instanciaId,
          para: mensaje.instanciaId,
          visible: document.visibilityState === "visible"
        });
        return;
      }

      if (mensaje.tipo === "IGP_INSTANCIA_PRESENTE" && mensaje.para === instanciaId) {
        console.info("[Informes_GP] Instancia previa detectada; la nueva pestaña no iniciará otra copia de la app.");
        finalizar({
          activo: true,
          duplicada: true,
          instanciaId,
          instanciaExistenteId: mensaje.instanciaId
        });

        // Sólo intentamos cerrar ESTA pestaña nueva. Nunca la instancia previa.
        // Si el navegador no lo permite, el bootstrap mostrará un aviso liviano.
        setTimeout(() => {
          try { window.close(); } catch {}
        }, 80);
      }
    });

    canal.postMessage({ tipo: "IGP_BUSCAR_INSTANCIA", instanciaId });

    setTimeout(() => {
      finalizar({ activo: true, duplicada: false, instanciaId });
    }, Math.max(80, Number(esperaMs) || ESPERA_DETECCION_MS));

    window.addEventListener("pagehide", cerrarCanal, { once: true });
  });
}

function cerrarCanal() {
  try { canal?.close(); } catch {}
  canal = null;
}

function crearIdInstancia() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
