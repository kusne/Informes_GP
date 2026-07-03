import { cargarComponenteHtml } from "../10_funciones_compartidas/ui/cargar-componente-html.js";
import { iniciarPantallaPrincipal } from "../01_Pantalla_Principal/pantalla-principal.js";

export async function iniciarApp() {
  const app = document.getElementById("app");

  if (!app) {
    throw new Error("No se encontró #app");
  }

  app.innerHTML = await cargarComponenteHtml("./00_app/app.html");

  await iniciarPantallaPrincipal({
    hostSelector: "#pantallaPrincipalHost"
  });
}
