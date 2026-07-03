import { cargarComponenteHtml } from "../../../10_funciones_compartidas/ui/cargar-componente-html.js";

export async function iniciarSelectorModoInforme({ hostSelector, onChange }) {
  const host = document.querySelector(hostSelector);
  if (!host) throw new Error(`No se encontró ${hostSelector}`);

  host.innerHTML = await cargarComponenteHtml("./01_Pantalla_Principal/componentes/selector-modo-informe/selector-modo-informe.html");

  const select = document.getElementById("modoInformeSelect");
  select.addEventListener("change", () => {
    onChange(select.value);
  });
}
