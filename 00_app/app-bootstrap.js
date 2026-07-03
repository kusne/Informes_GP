import { iniciarApp } from "./app.js";

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
