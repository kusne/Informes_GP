import { cargarComponenteHtml } from "../../../10_funciones_compartidas/ui/cargar-componente-html.js";

export async function renderContenedorInformeEspecial({ hostSelector, modelo }) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  host.innerHTML = await cargarComponenteHtml("./04_Informes/componentes/contenedor-informe-especial/contenedor-informe-especial.html");

  const contenido = document.getElementById("contenedorInformeEspecialContenido");

  if (!modelo) {
    contenido.innerHTML = "";
    return;
  }

  if (modelo === "CONTROL_SUPERIOR") {
    contenido.innerHTML = await cargarComponenteHtml("./04_Informes/modelos/control-superior/control-superior.html");
    return;
  }

  if (modelo === "ALCOHOLEMIA_POSITIVA") {
    contenido.innerHTML = await cargarComponenteHtml("./04_Informes/modelos/alcoholemia-positiva/alcoholemia-positiva.html");
    return;
  }

  if (modelo === "DECRETO_460_22") {
    contenido.innerHTML = await cargarComponenteHtml("./04_Informes/modelos/decreto-460-22/decreto-460-22.html");
    return;
  }
}
