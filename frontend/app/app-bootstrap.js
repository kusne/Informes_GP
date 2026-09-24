const URL_ACTUAL = new URL(import.meta.url);
const VERSION_DESPLIEGUE = URL_ACTUAL.searchParams.get("v") || `sesion-${Date.now()}`;
const NONCE_SESION = URL_ACTUAL.searchParams.get("n") || String(Date.now());
const SUFIJO_VERSION = `?v=${encodeURIComponent(VERSION_DESPLIEGUE)}&n=${encodeURIComponent(NONCE_SESION)}`;

const [
  { iniciarApp },
  { iniciarInstanciaUnicaInformesGP }
] = await Promise.all([
  import(`./app.js${SUFIJO_VERSION}`),
  import(`../servicios/navegacion/instancia-unica.js${SUFIJO_VERSION}`)
]);

aplicarCorreccionesVisualesGlobales();
// El selector se prepara sobre el encabezado ya incluido en index.html.
// No agrega esperas a la consulta de operativos ni reconstruye formularios.
const { iniciarSelectorColorLogo } = await import(`../servicios/identidad/logo-selector.js${SUFIJO_VERSION}`);
iniciarSelectorColorLogo();
// Exclusividad independiente de la versión: la última ventana abierta gana,
// sin cerrar Chrome ni la PWA o borrar los campos de la ventana anterior.
const { iniciarExclusividadSesionInformesGP } = await import(`../servicios/navegacion/sesion-activa.js${SUFIJO_VERSION}`);
iniciarExclusividadSesionInformesGP();
const deteccionInstancia = iniciarInstanciaUnicaInformesGP({
  versionActual: VERSION_DESPLIEGUE
});

async function iniciarAppCuandoDOMDisponible() {
  try {
    const instancia = await deteccionInstancia;
    if (instancia?.duplicada) {
      mostrarAvisoInstanciaDuplicada();
      return;
    }

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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarAppCuandoDOMDisponible, { once: true });
} else {
  void iniciarAppCuandoDOMDisponible();
}

function mostrarAvisoInstanciaDuplicada() {
  document.body.innerHTML = `
    <main style="min-height:100vh;background:#171c20;color:#fff;display:grid;place-items:center;padding:24px;font-family:Arial,sans-serif;">
      <section style="max-width:460px;text-align:center;background:#252d32;border-radius:18px;padding:28px;box-shadow:0 8px 30px rgba(0,0,0,.35);">
        <h1 style="margin-top:0;font-size:1.35rem;">Informes GP ya está abierto</h1>
        <p style="line-height:1.45;">Se detectó otra pestaña activa. Esta copia no se inició para evitar duplicados y cierres por exceso de pestañas.</p>
        <button id="igpCerrarDuplicada" type="button" style="padding:12px 18px;border:0;border-radius:10px;font-weight:700;">Cerrar esta pestaña</button>
      </section>
    </main>
  `;
  document.getElementById("igpCerrarDuplicada")?.addEventListener("click", () => {
    try { window.close(); } catch {}
  });
}

function aplicarCorreccionesVisualesGlobales() {
  if (document.getElementById("igp-correcciones-visuales-20260912")) return;

  const style = document.createElement("style");
  style.id = "igp-correcciones-visuales-20260912";
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
    .inicio-presencia-activa-card,
    .finaliza-presencia-activa-card {
      margin: 10px 0;
      padding: 10px 12px;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 10px;
    }
    .inicio-presencia-activa-card > label,
    .finaliza-presencia-activa-card > label {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 10px;
      color: #fff;
      font-size: 17px;
      font-weight: 900;
      cursor: pointer;
    }
    .inicio-presencia-activa-card > label input[type="checkbox"],
    .finaliza-presencia-activa-card > label input[type="checkbox"] {
      flex: 0 0 auto;
      width: 30px !important;
      height: 30px !important;
      margin: 0;
      padding: 0;
      accent-color: #1556a6;
      cursor: pointer;
    }
    .inicio-presencia-activa-card > label span,
    .finaliza-presencia-activa-card > label span {
      flex: 0 1 auto;
      color: #fff;
    }
    .inicio-presencia-activa-card select,
    .inicio-presencia-activa-card input[type="text"],
    .finaliza-presencia-activa-card select,
    .finaliza-presencia-activa-card input[type="text"] {
      width: 100%;
      box-sizing: border-box;
      margin-top: 6px;
    }
  `;
  document.head.appendChild(style);
}

function programarVerificacionOperativosInicial() {
  setTimeout(() => {
    if (document.visibilityState && document.visibilityState !== "visible") return;
    window.dispatchEvent(new Event("focus"));
  }, 900);
}
