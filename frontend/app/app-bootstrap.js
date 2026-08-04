import { iniciarApp } from "./app.js";
import { iniciarInstanciaUnicaInformesGP } from "../servicios/navegacion/instancia-unica.js";

iniciarInstanciaUnicaInformesGP();
registrarServiceWorkerSinBloquear();

window.addEventListener("informesgp:instancia-reemplazada", () => {
  import("../../backend/infraestructura/supabase/supabase-realtime.js")
    .then((modulo) => modulo.detenerRealtimeInformesGP?.())
    .catch(() => {});
});

window.addEventListener("DOMContentLoaded", async () => {
  try {
    await iniciarApp();
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

function registrarServiceWorkerSinBloquear() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    setTimeout(() => {
      const swUrl = new URL("../../sw.js", import.meta.url);
      const scopeUrl = new URL("../../", import.meta.url);

      navigator.serviceWorker
        .register(swUrl.href, { scope: scopeUrl.pathname })
        .catch((error) => {
          console.warn("[Informes_GP] Service Worker no disponible:", error);
        });
    }, 250);
  }, { once: true });
}
