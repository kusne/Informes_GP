import { cargarComponenteHtml } from "../../../10_funciones_compartidas/ui/cargar-componente-html.js";

export async function renderContadorOperativos(hostSelector, cantidad) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  host.innerHTML = await cargarComponenteHtml("./01_Pantalla_Principal/componentes/contador-operativos/contador-operativos.html");

  const valor = document.getElementById("contadorOperativosValor");
  if (valor) valor.textContent = String(cantidad ?? 0);
}
