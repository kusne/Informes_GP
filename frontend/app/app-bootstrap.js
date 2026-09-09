import { iniciarApp } from "./app.js?v=20260909-arranque-cache-operativos-v1";
import { iniciarInstanciaUnicaInformesGP } from "../servicios/navegacion/instancia-unica.js";

const VERSION_DESPLIEGUE = "20260909-arranque-cache-operativos-v1";

aplicarCorreccionesVisualesGlobales();
iniciarInstanciaUnicaInformesGP();
registrarServiceWorkerYActualizar();

window.addEventListener("informesgp:instancia-reemplazada", () => {
  import("../../api/persistencia-api.js")
    .then((modulo) => modulo.detenerRealtimeInformesGP?.())
    .catch(() => {});
});

window.addEventListener("DOMContentLoaded", async () => {
  try {
    await iniciarApp();
    programarVerificacionOperativosInicial();
  } catch (error) {
    console.error("[Informes_GP] Error al iniciar app:", error);
    document.body.innerHTML = `
      <pre style="color:white;background:#7f1d1d;padding:20px;">
        Error al iniciar Informes_GP:
        ${String(error?.message || error)}
      </pre>
    `;
  }
});

function aplicarCorreccionesVisualesGlobales() {
  if (document.getElementById("igp-correcciones-visuales-20260909")) return;

  const style = document.createElement("style");
  style.id = "igp-correcciones-visuales-20260909";
  style.textContent = `
    .inicio-opcion span,
    .finaliza-opcion span {
      min-width: 0 !important;
      flex: 1 1 auto !important;
      overflow: visible !important;
      text-overflow: clip !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
      line-height: 1.15 !important;
    }
  `;
  document.head.appendChild(style);
}

function programarVerificacionOperativosInicial() {
  // La primera consulta puede coincidir con el arranque de red/CDN en móviles.
  // Se hace una segunda lectura no destructiva automáticamente, equivalente a
  // la actualización que antes el usuario conseguía sólo refrescando la página.
  setTimeout(() => {
    if (document.visibilityState && document.visibilityState !== "visible") return;
    window.dispatchEvent(new Event("focus"));
  }, 900);
}

function registrarServiceWorkerYActualizar() {
  if (!("serviceWorker" in navigator)) return;

  const teniaControlador = Boolean(navigator.serviceWorker.controller);
  let recargaSolicitada = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // En una actualización real, el nuevo SW toma control y recargamos una sola
    // vez para que HTML/JS/CSS queden todos en la misma versión. En la primera
    // instalación no forzamos recarga.
    if (!teniaControlador || recargaSolicitada) return;
    recargaSolicitada = true;
    window.location.reload();
  });

  const swUrl = new URL(`../../sw.js?v=${VERSION_DESPLIEGUE}`, import.meta.url);
  const scopeUrl = new URL("../../", import.meta.url);

  navigator.serviceWorker
    .register(swUrl.href, {
      scope: scopeUrl.pathname,
      updateViaCache: "none"
    })
    .then((registro) => registro.update().catch(() => {}))
    .catch((error) => {
      console.warn("[Informes_GP] Service Worker no disponible:", error);
    });
}
