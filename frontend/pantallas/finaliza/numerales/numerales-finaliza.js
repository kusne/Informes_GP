import { cargarComponenteHtml } from "../../../servicios/ui/cargar-componente-html.js";
import {
  obtenerEstadoInformes,
  establecerEstadoInformes
} from "../../../../backend/aplicacion/estado/informes-state.js";
import {
  buscarNumeralPorCodigo,
  normalizarCodigo
} from "../../../../backend/dominio/finaliza/numerales/numerales-finaliza-data.js";

const estadoNumerales = {
  items: [],
  resumen: "",
  texto: ""
};

export async function cargarNumeralesFinaliza({
  form,
  contexto = {},
  limpiar = true
} = {}) {
  if (!form) return obtenerNumeralesFinaliza();

  if (limpiar) {
    limpiarNumeralesFinaliza({
      publicar: true
    });
  }

  const host = form.querySelector("[data-numerales-finaliza-host]");

  if (!host) {
    publicarNumeralesFinaliza();
    return obtenerNumeralesFinaliza();
  }

  host.innerHTML = await cargarComponenteHtml("/frontend/pantallas/finaliza/numerales/numerales-finaliza.html");

  iniciarNumeralesFinaliza({
    root: host,
    form,
    contexto
  });

  return obtenerNumeralesFinaliza();
}

export function iniciarNumeralesFinaliza({
  root = document,
  form = null
} = {}) {
  const inputCodigo = root.querySelector("#numeralFinalizaCodigo");
  const inputCantidad = root.querySelector("#numeralFinalizaCantidad");
  const inputDetalle = root.querySelector("#numeralFinalizaDetalle");
  const botonAgregar = root.querySelector("#botonAgregarNumeralFinaliza");
  const botonLimpiar = root.querySelector("#botonLimpiarNumeralesFinaliza");

  inputCodigo?.addEventListener("input", () => {
    const encontrado = buscarNumeralPorCodigo(inputCodigo.value);

    if (encontrado && inputDetalle && !String(inputDetalle.value || "").trim()) {
      inputDetalle.value = encontrado.detalle;
    }
  });

  inputCodigo?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      agregarDesdeFormulario({ root, form });
    }
  });

  inputDetalle?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.ctrlKey) {
      event.preventDefault();
      agregarDesdeFormulario({ root, form });
    }
  });

  botonAgregar?.addEventListener("click", () => {
    agregarDesdeFormulario({ root, form });
  });

  botonLimpiar?.addEventListener("click", () => {
    limpiarNumeralesFinaliza({
      publicar: true
    });

    renderNumerales({ root, form });
  });

  renderNumerales({ root, form });
  publicarNumeralesFinaliza();
}

export function obtenerNumeralesFinaliza() {
  return {
    items: estadoNumerales.items.map((item) => ({ ...item })),
    resumen: estadoNumerales.resumen,
    texto: estadoNumerales.texto
  };
}

export function limpiarNumeralesFinaliza({
  publicar = true
} = {}) {
  estadoNumerales.items = [];
  estadoNumerales.resumen = "";
  estadoNumerales.texto = "";

  window.InformesGP = window.InformesGP || {};
  window.InformesGP.numeralesFinaliza = {
    items: [],
    resumen: "",
    texto: ""
  };

  if (publicar) {
    publicarNumeralesFinaliza();
  }
}

export function aplicarNumeralesSugeridosFinaliza({
  items = [],
  reemplazar = false
} = {}) {
  if (reemplazar) {
    estadoNumerales.items = [];
  }

  for (const item of items) {
    agregarItemNumeral({
      codigo: item.codigo,
      cantidad: item.cantidad || 1,
      detalle: item.detalle,
      categoria: item.categoria || "SUGERIDO"
    });
  }

  publicarNumeralesFinaliza();

  return obtenerNumeralesFinaliza();
}

function agregarDesdeFormulario({
  root,
  form
}) {
  const inputCodigo = root.querySelector("#numeralFinalizaCodigo");
  const inputCantidad = root.querySelector("#numeralFinalizaCantidad");
  const inputDetalle = root.querySelector("#numeralFinalizaDetalle");

  const codigo = normalizarCodigo(inputCodigo?.value || "");
  const cantidad = normalizarCantidad(inputCantidad?.value || 1);
  const encontrado = buscarNumeralPorCodigo(codigo);
  const detalleManual = String(inputDetalle?.value || "").trim();
  const detalle = detalleManual || encontrado?.detalle || "";

  if (!codigo && !detalle) {
    alert("Debe ingresar código o detalle del numeral.");
    return;
  }

  agregarItemNumeral({
    codigo: codigo || "S/C",
    cantidad,
    detalle: detalle || "SIN DETALLE",
    categoria: encontrado?.categoria || "MANUAL"
  });

  if (inputCodigo) inputCodigo.value = "";
  if (inputCantidad) inputCantidad.value = "1";
  if (inputDetalle) inputDetalle.value = "";

  publicarNumeralesFinaliza();
  renderNumerales({ root, form });
  inputCodigo?.focus();
}

function agregarItemNumeral({
  codigo,
  cantidad = 1,
  detalle,
  categoria = "MANUAL"
}) {
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    codigo: normalizarCodigo(codigo || "S/C"),
    cantidad: normalizarCantidad(cantidad),
    detalle: String(detalle || "SIN DETALLE").trim(),
    categoria: String(categoria || "MANUAL").trim().toUpperCase()
  };

  const existente = estadoNumerales.items.find((n) => n.codigo === item.codigo && n.detalle === item.detalle);

  if (existente) {
    existente.cantidad += item.cantidad;
  } else {
    estadoNumerales.items.push(item);
  }
}

function renderNumerales({
  root,
  form
}) {
  const lista = root.querySelector("#numeralesFinalizaLista");
  const hidden = root.querySelector("#numeralesFinalizaTextoHidden");

  if (!lista) return;

  if (!estadoNumerales.items.length) {
    lista.innerHTML = `<div class="numerales-finaliza-vacio">Sin numerales cargados.</div>`;
  } else {
    lista.innerHTML = estadoNumerales.items.map((item) => `
      <div class="numeral-finaliza-item" data-id="${escapeHtml(item.id)}">
        <div>
          <strong>${escapeHtml(item.codigo)}</strong>
          <span>x${escapeHtml(item.cantidad)}</span>
          <small>${escapeHtml(item.categoria)}</small>
        </div>
        <p>${escapeHtml(item.detalle)}</p>
        <button type="button" data-borrar-numeral="${escapeHtml(item.id)}">borrar</button>
      </div>
    `).join("");
  }

  for (const boton of lista.querySelectorAll("[data-borrar-numeral]")) {
    boton.addEventListener("click", () => {
      const id = boton.dataset.borrarNumeral;
      estadoNumerales.items = estadoNumerales.items.filter((item) => item.id !== id);
      publicarNumeralesFinaliza();
      renderNumerales({ root, form });
    });
  }

  const texto = construirTextoNumerales();

  if (hidden) {
    hidden.value = texto;
  }

  if (form) {
    form.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function publicarNumeralesFinaliza() {
  estadoNumerales.resumen = construirResumenNumerales();
  estadoNumerales.texto = construirTextoNumerales();

  const payload = obtenerNumeralesFinaliza();

  window.InformesGP = window.InformesGP || {};
  window.InformesGP.numeralesFinaliza = payload;

  const estado = obtenerEstadoInformes();

  establecerEstadoInformes({
    ...estado,
    numeralesFinaliza: payload
  });
}

function construirResumenNumerales() {
  if (!estadoNumerales.items.length) return "";

  return estadoNumerales.items
    .map((item) => `${item.codigo} x${item.cantidad}`)
    .join(" | ");
}

function construirTextoNumerales() {
  if (!estadoNumerales.items.length) return "";

  return estadoNumerales.items
    .map((item) => `${item.codigo} x${item.cantidad} - ${item.detalle}`)
    .join("\n");
}

function normalizarCantidad(valor) {
  const n = Number(valor || 1);

  if (!Number.isFinite(n) || n <= 0) return 1;

  return Math.trunc(n);
}

function escapeHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}