import { cargarComponenteHtml } from "../../../../servicios/ui/cargar-componente-html.js";

let ultimoRender = {
  modo: "",
  items: []
};

export async function renderSelectorOperativoContextual({
  hostSelector,
  modo,
  operativosIniciales = [],
  onChange
} = {}) {
  const host = document.querySelector(hostSelector);

  if (!host) return;

  host.innerHTML = await cargarComponenteHtml("/frontend/pantallas/pantalla-principal/componentes/selector-operativo-contextual/selector-operativo-contextual.html");

  const selector = host.querySelector("#selectorOperativoContextual, #operativoContextualSelect");
  const label = host.querySelector("#selectorOperativoContextualLabel");
  const ayuda = host.querySelector("#selectorOperativoContextualAyuda");

  const modoNormalizado = normalizarModo(modo);
  const items = Array.isArray(operativosIniciales) ? operativosIniciales : [];

  ultimoRender = {
    modo: modoNormalizado,
    items
  };

  if (!selector) return;

  if (label) label.textContent = resolverLabel(modoNormalizado);
  if (ayuda) ayuda.textContent = resolverAyuda(modoNormalizado, items.length);

  llenarSelector({
    selector,
    modo: modoNormalizado,
    items
  });

  selector.addEventListener("change", async () => {
    const key = selector.value;
    const item = items.find((op) => String(op.operativo_key || op.modelo_key) === key) || null;

    if (typeof onChange === "function") {
      await onChange(item);
    }
  });

  return selector;
}

export function obtenerUltimoSelectorOperativoContextual() {
  return {
    ...ultimoRender
  };
}

function llenarSelector({
  selector,
  modo,
  items
}) {
  selector.innerHTML = "";

  if (modo === "CONTROL_MOVILES") {
    selector.disabled = true;
    selector.appendChild(crearOption("", "Control de móviles no requiere operativo seleccionado."));
    return;
  }

  if (!modo) {
    selector.disabled = true;
    selector.appendChild(crearOption("", "Seleccione primero una opción."));
    return;
  }

  selector.disabled = false;

  if (!items.length) {
    selector.appendChild(crearOption("", resolverTextoSinItems(modo)));
    return;
  }

  selector.appendChild(crearOption("", resolverPlaceholder(modo)));

  for (const item of items) {
    selector.appendChild(crearOption(
      item.operativo_key || item.modelo_key,
      construirEtiquetaItem(item, modo)
    ));
  }
}

function crearOption(value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;

  return option;
}

function construirEtiquetaItem(item = {}, modo) {
  if (modo === "INFORMES" || item.tipo_item === "MODELO_INFORME") {
    return String(item.label || item.nombre || item.modelo_key || "MODELO DE INFORME").trim();
  }

  return String(
    item.etiqueta ||
    `${item.franja_horaria || construirFranja(item.hora_inicio, item.hora_fin) || "SIN HORARIO"} - ${item.lugar || item.qth || item.ubicacion || "SIN LUGAR"} - ${String(item.tipo_nombre || item.tipo_operativo || "OPERATIVO").replaceAll("_", " ")}`
  ).trim();
}

function construirFranja(inicio, fin) {
  const i = String(inicio || "").trim();
  const f = String(fin || "").trim();

  if (i && f) return /FINALIZAR/i.test(f) ? `${i} A FINALIZAR` : `${i} A ${f} HS`;
  if (i) return `${i} HS`;

  return "";
}

function resolverLabel(modo) {
  if (modo === "INICIA") return "Operativos pendientes / franjas horarias";
  if (modo === "FINALIZA") return "Operativos iniciados / en curso";
  if (modo === "INFORMES") return "Modelos de informes";
  if (modo === "CONTROL_MOVILES") return "Control de móviles";

  return "Operativo / franja horaria";
}

function resolverAyuda(modo, cantidad) {
  if (!modo) return "El segundo desplegable se carga después de elegir una opción.";
  if (modo === "CONTROL_MOVILES") return "Este módulo no depende de un operativo puntual.";
  if (modo === "INICIA") return `${cantidad} operativo(s) pendiente(s) para iniciar.`;
  if (modo === "FINALIZA") return `${cantidad} operativo(s) iniciado(s) para finalizar.`;
  if (modo === "INFORMES") return `${cantidad} modelo(s) de informe disponible(s).`;

  return "";
}

function resolverPlaceholder(modo) {
  if (modo === "INFORMES") return "Seleccionar informe";
  if (modo === "INICIA") return "Seleccionar operativo";
  if (modo === "FINALIZA") return "Seleccionar operativo iniciado";

  return "Seleccionar";
}

function resolverTextoSinItems(modo) {
  if (modo === "INICIA") return "No hay operativos pendientes para iniciar.";
  if (modo === "FINALIZA") return "No hay operativos iniciados para finalizar.";
  if (modo === "INFORMES") return "No hay modelos de informes disponibles.";

  return "No hay opciones disponibles.";
}

function normalizarModo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}