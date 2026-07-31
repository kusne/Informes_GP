import { registrarNumeralesFinaliza } from "../../../../backend/aplicacion/estado/informes-coordinador.js";
import { extraerItemsNumerales } from "../../../../backend/dominio/finaliza/numerales/normalizador-numerales.js";
import { consolidarItemsNumerales } from "../../../../backend/dominio/finaliza/numerales/contador-numerales.js";
import { clasificarItemsNumerales } from "../../../../backend/dominio/finaliza/numerales/clasificador-numerales.js";

let estadoNumerales = {
  items: [],
  resumen: ""
};

export function iniciarArchivosNumerales({ root = document } = {}) {
  const modulo = root.querySelector("[data-archivos-numerales]");
  if (!modulo) return estadoNumerales;

  const entrada = modulo.querySelector("#numeralesTextoEntrada");
  const salida = modulo.querySelector("#numeralesResumenSalida");
  const hidden = modulo.querySelector("#numeralesItemsJson");

  if (!entrada) return estadoNumerales;

  const handler = () => {
    const itemsExtraidos = extraerItemsNumerales(entrada.value);
    const consolidados = consolidarItemsNumerales(itemsExtraidos);
    const clasificados = clasificarItemsNumerales(consolidados);

    const resumen = construirResumenNumerales(clasificados);

    estadoNumerales = {
      items: clasificados,
      resumen
    };

    if (salida) salida.value = resumen;
    if (hidden) hidden.value = JSON.stringify(clasificados);

    publicarEstadoNumerales();
    dispararCambioFormulario(modulo);
  };

  entrada.addEventListener("input", handler);
  entrada.addEventListener("change", handler);

  handler();

  return estadoNumerales;
}

export function obtenerEstadoNumerales() {
  return {
    items: Array.isArray(estadoNumerales.items) ? [...estadoNumerales.items] : [],
    resumen: estadoNumerales.resumen || ""
  };
}

export function limpiarEstadoNumerales() {
  estadoNumerales = {
    items: [],
    resumen: ""
  };

  publicarEstadoNumerales();
  return obtenerEstadoNumerales();
}

function construirResumenNumerales(items) {
  if (!Array.isArray(items) || !items.length) return "";

  return items.map((item) => {
    const codigo = item.codigo ? `${item.codigo} - ` : "";
    return `${codigo}${item.descripcion}: ${item.cantidad}`;
  }).join("\n");
}

function publicarEstadoNumerales() {
  const resumen = obtenerEstadoNumerales();

  registrarNumeralesFinaliza(resumen);

  window.InformesGP = window.InformesGP || {};
  window.InformesGP.numeralesFinaliza = resumen;
}

function dispararCambioFormulario(modulo) {
  const form = modulo.closest(".formulario-finaliza");

  if (!form) return;

  form.dispatchEvent(new Event("change", {
    bubbles: true
  }));
}
