import { cargarComponenteHtml } from "../../../10_funciones_compartidas/ui/cargar-componente-html.js";
import { iniciarInformes } from "../../../04_Informes/informes.js";

export async function renderContenedorDinamico({ hostSelector, modo, operativoSeleccionado }) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  host.innerHTML = await cargarComponenteHtml("./01_Pantalla_Principal/componentes/contenedor-dinamico/contenedor-dinamico.html");

  const contenido = document.getElementById("contenedorDinamicoContenido");

  if (!modo) {
    contenido.innerHTML = "";
    return;
  }

  if (modo === "INICIA") {
    contenido.innerHTML = await cargarComponenteHtml("./02_Inicia/inicia.html");
    return;
  }

  if (modo === "FINALIZA") {
    contenido.innerHTML = await cargarComponenteHtml("./03_Finaliza/finaliza.html");
    return;
  }

  if (modo === "INFORMES") {
    contenido.innerHTML = await cargarComponenteHtml("./04_Informes/informes.html");
    await iniciarInformes({
      operativoSeleccionado
    });
    return;
  }

  if (modo === "CONTROL_MOVILES") {
    contenido.innerHTML = await cargarComponenteHtml("./05_Control_Moviles/control-moviles.html");
    return;
  }
}
