const CANAL_INSTANCIA = "informes-gp-instancia-unica-v3";
const ESPERA_DETECCION_MS = 250;
const URL_VERSION = "https://api.github.com/repos/kusne/Informes_GP/commits/main";

let canal = null;
let instanciaId = "";
let versionInstancia = "";
let revisionNoConfirmada = false;
let obsoleta = false;
let verificacionEnCurso = null;

/**
 * La última pestaña abierta tiene prioridad. Si el código publicado cambió,
 * bloquear esta pestaña y exigir recarga sin descartar un informe en edición.
 */
export function iniciarInstanciaUnicaInformesGP({
  esperaMs = ESPERA_DETECCION_MS,
  versionActual = ""
} = {}) {
  versionInstancia = String(versionActual || "").trim();
  instanciaId = crearIdInstancia();

  if (!versionInstancia) {
    bloquearInstancia("No se pudo verificar la versión de Informes GP.");
    return Promise.resolve({ activo: false, duplicada: true });
  }

  if (!("BroadcastChannel" in window)) {
    registrarVerificacionAlVolver();
    return Promise.resolve({ activo: true, duplicada: false, motivo: "BroadcastChannel no disponible" });
  }

  canal = new BroadcastChannel(CANAL_INSTANCIA);
  canal.addEventListener("message", (event) => {
    const mensaje = event?.data || {};
    if (!mensaje || mensaje.instanciaId === instanciaId) return;

    if (mensaje.tipo === "IGP_VERSION_NUEVA" &&
        mensaje.version !== versionInstancia) {
      bloquearInstancia("Se publicó una versión nueva de Informes GP.");
    }
  });

  // La app instalada y Chrome pueden coexistir: jamás cerrar o bloquear
  // una ventana porque otra sesión de Informes GP se haya abierto.
  // Solo una versión comprobada como obsoleta puede quedar bloqueada.

  window.addEventListener("pagehide", cerrarCanal, { once: true });
  registrarVerificacionAlVolver();
  registrarAvisosServiceWorker();
  void verificarVersionPublicada();

  return new Promise((resolve) => {
    setTimeout(() => resolve({
      activo: !obsoleta,
      duplicada: obsoleta,
      instanciaId
    }), Math.max(80, Number(esperaMs) || ESPERA_DETECCION_MS));
  });
}

function registrarAvisosServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("message", (event) => {
    const mensaje = event?.data || {};
    if (mensaje.tipo !== "IGP_SW_ACTIVADO") return;
    const versionActivada = String(mensaje.version || "").trim();
    if (versionActivada && versionActivada !== versionInstancia) {
      bloquearInstancia("Informes GP recibió una actualización. Cargue la versión actual para continuar.");
    }
  });

  // Al regresar desde segundo plano puede haberse reemplazado el SW durante
  // la suspensión del teléfono, sin entregar el mensaje a esta pestaña.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    const controlador = navigator.serviceWorker.controller;
    if (!controlador || obsoleta) return;
    try {
      const versionControlador = new URL(controlador.scriptURL).searchParams.get("v");
      if (versionControlador && versionControlador !== versionInstancia) {
        bloquearInstancia("El controlador de Informes GP cambió a otra versión. Actualice para continuar.");
      }
    } catch {}
  });
}

function registrarVerificacionAlVolver() {
  const alVolver = () => {
    if (obsoleta || (document.visibilityState && document.visibilityState !== "visible")) return;
    void verificarVersionPublicada();
  };
  window.addEventListener("focus", alVolver);
  window.addEventListener("pageshow", alVolver);
  document.addEventListener("visibilitychange", alVolver);
}

async function verificarVersionPublicada() {
  if (obsoleta || verificacionEnCurso) return verificacionEnCurso;
  verificacionEnCurso = (async () => {
    try {
      const url = new URL(URL_VERSION);
      url.searchParams.set("_igp", String(Date.now()));
      const response = await fetch(url.href, { cache: "no-store", headers: { Accept: "application/vnd.github+json" } });
      if (!response.ok) throw new Error("No fue posible consultar la versión publicada.");
      const data = await response.json();
      const versionPublicada = String(data?.sha || "").trim();
      if (!versionPublicada) throw new Error("GitHub no informó la versión.");
      revisionNoConfirmada = false;
      if (versionPublicada !== versionInstancia) {
        canal?.postMessage({
          tipo: "IGP_VERSION_NUEVA", instanciaId, version: versionPublicada
        });
        bloquearInstancia("Se publicó una nueva versión de Informes GP.");
      }
    } catch (error) {
      if (!revisionNoConfirmada) console.warn("[Informes_GP] No se pudo verificar la versión vigente.", error);
      revisionNoConfirmada = true;
      // Nunca asumir que la versión local es la última si la verificación falló.
      bloquearInstancia("No se pudo verificar la versión vigente de Informes GP. Conéctese a Internet y recargue.");
    } finally {
      verificacionEnCurso = null;
    }
  })();
  return verificacionEnCurso;
}

function bloquearInstancia(mensaje) {
  if (obsoleta) return;
  obsoleta = true;
  const aviso = document.createElement("div");
  aviso.id = "igpBloqueoVersion";
  aviso.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#121820;color:white;display:grid;place-items:center;padding:24px;font:17px Arial,sans-serif";
  aviso.innerHTML = `<section style="max-width:480px;background:#252d32;border-radius:16px;padding:24px;line-height:1.5">
    <h2 style="margin-top:0">Informes GP: sesión no vigente</h2>
    <p id="igpMotivoVersion"></p>
    <p>Si estaba completando un informe sin enviar, copie los datos antes de recargar. Esta pestaña queda bloqueada para evitar envíos con código anterior.</p>
    <button id="igpRecargarVersion" type="button" style="padding:12px 18px;border-radius:8px;font-weight:700">Cargar versión actual</button>
  </section>`;
  aviso.querySelector("#igpMotivoVersion").textContent = mensaje;
  aviso.querySelector("#igpRecargarVersion").addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.searchParams.set("_igp", String(Date.now()));
    window.location.replace(url.href);
  });
  const insertar = () => { if (!document.getElementById(aviso.id)) document.body.appendChild(aviso); };
  if (document.body) insertar();
  else document.addEventListener("DOMContentLoaded", insertar, { once: true });
  console.warn("[Informes_GP] Sesión bloqueada:", mensaje);
}

function cerrarCanal() {
  try { canal?.close(); } catch {}
  canal = null;
}

function crearIdInstancia() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
