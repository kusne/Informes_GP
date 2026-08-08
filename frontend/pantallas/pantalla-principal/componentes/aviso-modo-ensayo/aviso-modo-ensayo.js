import { cargarComponenteHtml } from "../../../../servicios/ui/cargar-componente-html.js";
import { modoEnsayoActivo } from "../../../../../api/app-api.js";

export async function renderAvisoModoEnsayo({ hostSelector } = {}) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  if (!modoEnsayoActivo()) {
    host.innerHTML = "";
    host.classList.add("hidden");
    return;
  }

  host.classList.remove("hidden");
  host.innerHTML = await cargarComponenteHtml(
    "/frontend/pantallas/pantalla-principal/componentes/aviso-modo-ensayo/aviso-modo-ensayo.html"
  );
}
