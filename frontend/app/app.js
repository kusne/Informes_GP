import { cargarComponenteHtml } from "../servicios/ui/cargar-componente-html.js";
import { iniciarPantallaPrincipal } from "../pantallas/pantalla-principal/pantalla-principal.js";
import { obtenerGuardiaFecha0600 } from "../../backend/dominio/compartido/fechas/guardia-0600.js";
import { establecerGuardiaFechaOperativos } from "../../backend/aplicacion/operativos/operativos-contexto.js";
import { registrarModoEnsayoEnWindow } from "../../backend/infraestructura/ensayo/modo-ensayo.js";

export async function iniciarApp() {
  const app = document.getElementById("app");

  if (!app) {
    throw new Error("No se encontró #app");
  }

  const guardiaFecha = obtenerGuardiaFecha0600();
  establecerGuardiaFechaOperativos(guardiaFecha);

  window.InformesGP = window.InformesGP || {};
  window.InformesGP.guardiaFecha = guardiaFecha;
  registrarModoEnsayoEnWindow();

  app.innerHTML = await cargarComponenteHtml("/frontend/app/app.html");

  await iniciarPantallaPrincipal({
    hostSelector: "#pantallaPrincipalHost"
  });
}