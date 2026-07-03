import { renderSelectorInformeEspecial } from "./componentes/selector-informe-especial/selector-informe-especial.js";
import { renderAvisoVinculoOperativo } from "./componentes/aviso-vinculo-operativo/aviso-vinculo-operativo.js";
import { renderContenedorInformeEspecial } from "./componentes/contenedor-informe-especial/contenedor-informe-especial.js";

export async function iniciarInformes({ operativoSeleccionado }) {
  await renderSelectorInformeEspecial({
    hostSelector: "#selectorInformeEspecialHost",
    onChange: async (modelo) => {
      await renderAvisoVinculoOperativo({
        hostSelector: "#avisoVinculoOperativoHost",
        operativoSeleccionado
      });

      await renderContenedorInformeEspecial({
        hostSelector: "#contenedorInformeEspecialHost",
        modelo,
        operativoSeleccionado
      });
    }
  });

  await renderAvisoVinculoOperativo({
    hostSelector: "#avisoVinculoOperativoHost",
    operativoSeleccionado
  });

  await renderContenedorInformeEspecial({
    hostSelector: "#contenedorInformeEspecialHost",
    modelo: "",
    operativoSeleccionado
  });
}
