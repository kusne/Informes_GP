import { cargarComponenteHtml } from "../servicios/ui/cargar-componente-html.js";
import { iniciarPantallaPrincipal } from "../pantallas/pantalla-principal/pantalla-principal.js?v=20260808-arquitectura-aislada-v1";
import { obtenerGuardiaFecha0600 } from "../../api/app-api.js";
import { establecerGuardiaFechaOperativos } from "../../api/app-api.js";
import { inicializarEntornoAplicacion, registrarGuardiaFecha } from "../../api/app-api.js";

export async function iniciarApp() {
  const app = document.getElementById("app");

  if (!app) {
    throw new Error("No se encontró #app");
  }

  const guardiaFecha = obtenerGuardiaFecha0600();
  establecerGuardiaFechaOperativos(guardiaFecha);

  inicializarEntornoAplicacion();
  registrarGuardiaFecha(guardiaFecha);

  // GitHub Pages ya entrega el shell crítico dentro de index.html para que
  // la interfaz aparezca de inmediato. En entornos antiguos se conserva el
  // cargador HTML como fallback.
  if (!app.querySelector("#pantallaPrincipalHost")) {
    app.innerHTML = await cargarComponenteHtml("/frontend/app/app.html");
  }

  // INFORMES usa una superficie DOM independiente. Nunca se monta el formulario
  // dentro de la página que contiene selector y tarjetas.
  asegurarHostDetalleInformes(app);

  await iniciarPantallaPrincipal({
    hostSelector: "#pantallaPrincipalHost"
  });
}

function asegurarHostDetalleInformes(app) {
  if (document.getElementById("informeDetallePaginaHost")) return;

  const host = document.createElement("section");
  host.id = "informeDetallePaginaHost";
  host.className = "informe-detalle-pagina-host";
  host.hidden = true;
  host.setAttribute("aria-hidden", "true");

  const shell = app.querySelector(".app-shell") || app;
  shell.appendChild(host);
}
