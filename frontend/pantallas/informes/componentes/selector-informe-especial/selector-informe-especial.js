import { cargarComponenteHtml } from "../../../../servicios/ui/cargar-componente-html.js";

export async function renderSelectorInformeEspecial({
  hostSelector,
  onChange
} = {}) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  host.innerHTML = await cargarComponenteHtml("/frontend/pantallas/informes/componentes/selector-informe-especial/selector-informe-especial.html");

  const select = host.querySelector("#selectorInformeEspecialSelect");
  if (!select) return;

  select.addEventListener("change", async () => {
    if (typeof onChange === "function") {
      await onChange(normalizarModelo(select.value));
    }
  });
}

function normalizarModelo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}