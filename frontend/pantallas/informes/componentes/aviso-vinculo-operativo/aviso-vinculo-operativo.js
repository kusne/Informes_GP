import { cargarComponenteHtml } from "../../../../servicios/ui/cargar-componente-html.js";

export async function renderAvisoVinculoOperativo({
  hostSelector,
  operativoSeleccionado
} = {}) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  host.innerHTML = await cargarComponenteHtml("/frontend/pantallas/informes/componentes/aviso-vinculo-operativo/aviso-vinculo-operativo.html");

  const texto = host.querySelector("#avisoVinculoOperativoTexto");
  if (!texto) return;

  if (!operativoSeleccionado) {
    texto.textContent = "No hay operativo seleccionado.";
    return;
  }

  const horario = `${operativoSeleccionado.hora_inicio || "--:--"} A ${operativoSeleccionado.hora_fin || "--:--"} HS`;
  const lugar = operativoSeleccionado.lugar || "SIN LUGAR";
  const tipo = operativoSeleccionado.tipo_nombre || operativoSeleccionado.tipo_operativo || "OPERATIVO";

  texto.textContent = `${horario} - ${lugar} - ${tipo}`;
}