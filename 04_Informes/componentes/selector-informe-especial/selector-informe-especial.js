import { cargarComponenteHtml } from "../../../10_funciones_compartidas/ui/cargar-componente-html.js";

export async function renderSelectorInformeEspecial({ hostSelector, onChange }) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  host.innerHTML = await cargarComponenteHtml("./04_Informes/componentes/selector-informe-especial/selector-informe-especial.html");

  const select = document.getElementById("informeEspecialSelect");
  select.addEventListener("change", () => onChange(select.value));
}
