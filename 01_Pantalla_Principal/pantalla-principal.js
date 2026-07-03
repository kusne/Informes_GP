import { cargarComponenteHtml } from "../10_funciones_compartidas/ui/cargar-componente-html.js";
import { iniciarSelectorModoInforme } from "./componentes/selector-modo-informe/selector-modo-informe.js";
import { renderContadorOperativos } from "./componentes/contador-operativos/contador-operativos.js";
import { renderSelectorOperativoContextual } from "./componentes/selector-operativo-contextual/selector-operativo-contextual.js";
import { renderContenedorDinamico } from "./componentes/contenedor-dinamico/contenedor-dinamico.js";

const estadoPantalla = {
  modo: "",
  operativoSeleccionado: null,
  cantidadOperativos: 0
};

export async function iniciarPantallaPrincipal({ hostSelector }) {
  const host = document.querySelector(hostSelector);

  if (!host) {
    throw new Error(`No se encontró host de pantalla principal: ${hostSelector}`);
  }

  host.innerHTML = await cargarComponenteHtml("./01_Pantalla_Principal/pantalla-principal.html");

  await iniciarSelectorModoInforme({
    hostSelector: "#selectorModoInformeHost",
    onChange: async (modo) => {
      estadoPantalla.modo = modo;
      estadoPantalla.operativoSeleccionado = null;
      actualizarTituloContador(modo);
      renderContadorOperativos("#contadorOperativosHost", estadoPantalla.cantidadOperativos);
      await renderSelectorOperativoContextual({
        hostSelector: "#selectorOperativoContextualHost",
        modo,
        cantidadOperativos: estadoPantalla.cantidadOperativos,
        onChange: async (operativo) => {
          estadoPantalla.operativoSeleccionado = operativo;
          await renderContenedorDinamico({
            hostSelector: "#contenedorDinamicoHost",
            modo: estadoPantalla.modo,
            operativoSeleccionado: estadoPantalla.operativoSeleccionado
          });
        }
      });

      await renderContenedorDinamico({
        hostSelector: "#contenedorDinamicoHost",
        modo,
        operativoSeleccionado: null
      });
    }
  });

  actualizarTituloContador("");
  renderContadorOperativos("#contadorOperativosHost", estadoPantalla.cantidadOperativos);
  await renderSelectorOperativoContextual({
    hostSelector: "#selectorOperativoContextualHost",
    modo: "",
    cantidadOperativos: estadoPantalla.cantidadOperativos,
    onChange: async () => {}
  });
  await renderContenedorDinamico({
    hostSelector: "#contenedorDinamicoHost",
    modo: "",
    operativoSeleccionado: null
  });
}

function actualizarTituloContador(modo) {
  const titulo = document.getElementById("tituloContadorOperativos");
  if (!titulo) return;

  if (modo === "FINALIZA" || modo === "INFORMES") {
    titulo.textContent = "OPERATIVOS INICIADOS";
    return;
  }

  titulo.textContent = "OPERATIVOS";
}
