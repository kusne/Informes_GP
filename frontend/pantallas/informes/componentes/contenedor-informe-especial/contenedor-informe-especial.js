import { cargarComponenteHtml } from "../../../../servicios/ui/cargar-componente-html.js";
import { resolverRutaApp } from "../../../../servicios/rutas/rutas-app.js";
import { registrarInformeModulo } from "../../../../../api/app-api.js";

const MODELOS = {
  CONTROL_SUPERIOR: {
    html: "/frontend/pantallas/informes/modelos/control-superior/control-superior.html",
    modulo: "../../modelos/control-superior/control-superior.js",
    iniciar: "iniciarControlSuperior"
  },
  ALCOHOLEMIA_POSITIVA: {
    html: "/frontend/pantallas/informes/modelos/alcoholemia-positiva/alcoholemia-positiva.html",
    modulo: "../../modelos/alcoholemia-positiva/alcoholemia-positiva.js",
    iniciar: "iniciarAlcoholemiaPositiva"
  },
  DECRETO_460_22: {
    html: "/frontend/pantallas/informes/modelos/decreto-460-22/decreto-460-22.html",
    modulo: "../../modelos/decreto-460-22/decreto-460-22.js",
    iniciar: "iniciarDecreto46022"
  },
  REQUISA_VEHICULAR: {
    html: "/frontend/pantallas/informes/modelos/requisa-vehicular/requisa-vehicular.html",
    modulo: "../../modelos/requisa-vehicular/requisa-vehicular.js",
    iniciar: "iniciarModeloInformeUI"
  }
};

export async function renderContenedorInformeEspecial({
  hostSelector,
  modelo,
  operativoSeleccionado,
  getContexto
} = {}) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  host.innerHTML = await cargarComponenteHtml("/frontend/pantallas/informes/componentes/contenedor-informe-especial/contenedor-informe-especial.html");

  const contenido = host.querySelector("#contenedorInformeEspecialContenido");
  if (!contenido) return;

  const modeloNormalizado = normalizarModelo(modelo);

  if (!modeloNormalizado) {
    contenido.innerHTML = `
      <section class="pantalla-mensaje">
        <h2>INFORMES</h2>
        <p>Seleccione el tipo de informe especial.</p>
      </section>
    `;

    registrarInformeModulo({
      actual: null,
      errores: ["Debe seleccionar un tipo de informe especial."],
      texto: "",
      supabasePayload: null
    });

    return;
  }

  const config = MODELOS[modeloNormalizado];

  if (!config) {
    contenido.innerHTML = `
      <section class="pantalla-mensaje error-formulario">
        <h2>INFORMES</h2>
        <p>No se reconoce el modelo de informe especial seleccionado.</p>
      </section>
    `;

    registrarInformeModulo({
      actual: null,
      errores: ["No se reconoce el modelo de informe especial seleccionado."],
      texto: "",
      supabasePayload: null
    });

    return;
  }

  contenido.innerHTML = await cargarComponenteHtml(config.html);

  const modulo = await import(resolverRutaApp(config.modulo));
  const iniciar = modulo?.[config.iniciar];

  if (typeof iniciar !== "function") {
    registrarInformeModulo({
      actual: null,
      errores: [`No se encontró el iniciador del modelo ${modeloNormalizado}.`],
      texto: "",
      supabasePayload: null
    });
    return;
  }

  await iniciar({
    operativoSeleccionado,
    getContexto
  });
}

function normalizarModelo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}
