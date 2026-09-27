/* Instalación PWA aislada: no modifica formularios, sesiones ni datos. */
(() => {
  "use strict";
  let solicitud = null;
  let aviso = null;
  const instalada = () => window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  function ocultar() {
    aviso?.remove();
    aviso = null;
  }

  function mostrar() {
    if (!solicitud || instalada() || aviso || document.getElementById("igp-instalar-app")) return;
    aviso = document.createElement("aside");
    aviso.id = "igp-instalar-app";
    aviso.setAttribute("aria-label", "Instalar Informes GP");
    aviso.style.cssText = "position:fixed;bottom:12px;left:12px;right:12px;max-width:480px;margin:auto;z-index:9999;display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px;border:1px solid #bdc7d4;border-radius:12px;background:#fff;color:#18283f;box-shadow:0 4px 18px #0004;font:600 14px Arial,sans-serif";
    const texto = document.createElement("span");
    texto.textContent = "Instalá Informes GP en tu dispositivo";
    const acciones = document.createElement("div");
    acciones.style.cssText = "display:flex;gap:6px;flex-shrink:0";
    const instalar = document.createElement("button");
    instalar.type = "button";
    instalar.textContent = "Instalar";
    instalar.style.cssText = "border:0;border-radius:8px;padding:10px 12px;background:#1769bd;color:white;font:700 14px Arial,sans-serif;cursor:pointer";
    const cerrar = document.createElement("button");
    cerrar.type = "button";
    cerrar.textContent = "×";
    cerrar.setAttribute("aria-label", "Cerrar aviso de instalación");
    cerrar.style.cssText = "border:0;border-radius:8px;padding:5px 10px;background:#eef1f6;color:#18283f;font:700 20px Arial,sans-serif;cursor:pointer";
    cerrar.addEventListener("click", ocultar);
    instalar.addEventListener("click", async () => {
      const evento = solicitud;
      if (!evento) return;
      solicitud = null;
      ocultar();
      try {
        await evento.prompt();
        await evento.userChoice;
      } catch (error) {
        console.warn("[Informes_GP] No se pudo mostrar la instalación:", error);
      }
    });
    acciones.append(instalar, cerrar);
    aviso.append(texto, acciones);
    document.body.append(aviso);
  }

  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault();
    if (instalada()) return;
    solicitud = evento;
    if (document.body) mostrar();
    else window.addEventListener("DOMContentLoaded", mostrar, { once: true });
  });

  window.addEventListener("appinstalled", () => {
    solicitud = null;
    ocultar();
  });
})();
