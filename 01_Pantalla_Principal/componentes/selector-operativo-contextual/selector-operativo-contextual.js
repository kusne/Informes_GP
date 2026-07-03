import { cargarComponenteHtml } from "../../../10_funciones_compartidas/ui/cargar-componente-html.js";

export async function renderSelectorOperativoContextual({ hostSelector, modo, cantidadOperativos, onChange }) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  host.innerHTML = await cargarComponenteHtml("./01_Pantalla_Principal/componentes/selector-operativo-contextual/selector-operativo-contextual.html");

  const select = document.getElementById("operativoContextualSelect");

  const opciones = construirOpciones(modo, cantidadOperativos);

  select.innerHTML = opciones.map((op) => {
    return `<option value="${op.value}">${op.label}</option>`;
  }).join("");

  select.addEventListener("change", () => {
    const value = select.value;
    const operativo = value ? { operativo_key: value, tipo_operativo: "GENERICO" } : null;
    onChange(operativo);
  });
}

function construirOpciones(modo, cantidadOperativos) {
  if (!modo) {
    return [{ value: "", label: "Seleccionar Operativo" }];
  }

  if (modo === "INICIA") {
    if (!cantidadOperativos) {
      return [{ value: "", label: "No hay operativos cargados" }];
    }
    return [{ value: "", label: "Seleccionar operativo" }];
  }

  if (modo === "FINALIZA" || modo === "INFORMES") {
    if (!cantidadOperativos) {
      return [{ value: "", label: "No hay operativos iniciados" }];
    }
    return [{ value: "", label: "Seleccionar operativo iniciado" }];
  }

  if (modo === "CONTROL_MOVILES") {
    return [{ value: "", label: "Control de móviles" }];
  }

  return [{ value: "", label: "Seleccionar" }];
}
