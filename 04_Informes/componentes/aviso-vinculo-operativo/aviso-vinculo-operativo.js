import { cargarComponenteHtml } from "../../../10_funciones_compartidas/ui/cargar-componente-html.js";

export async function renderAvisoVinculoOperativo({ hostSelector, operativoSeleccionado }) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  host.innerHTML = await cargarComponenteHtml("./04_Informes/componentes/aviso-vinculo-operativo/aviso-vinculo-operativo.html");

  const texto = document.getElementById("avisoVinculoOperativoTexto");
  if (!texto) return;

  texto.textContent = operativoSeleccionado
    ? "Informe vinculado al operativo seleccionado."
    : "No hay operativos iniciados para vincular el informe.";
}
