import { registrarInicioModulo } from "../../../api/app-api.js";
import {
  obtenerCatalogoRecursosInicio,
  construirResumenRecursosInicio
} from "../../../api/app-api.js";
import { cargarFotosDeFormulario } from "../../servicios/fotos/fotos-formulario-loader.js";
import { construirInicioDesdeFormulario } from "./compartido/inicio-builder.js";
import {
  renderPersonalPolicial,
  obtenerPersonalSeleccionado
} from "./componentes/personal-policial/personal-policial.js";
import {
  renderMovilidad,
  obtenerMovilidadSeleccionada
} from "./componentes/movilidad/movilidad.js";
import {
  renderElementos,
  obtenerElementosSeleccionados
} from "./componentes/elementos/elementos.js";
import { iniciarObservacionesInicio } from "./componentes/observaciones/observaciones.js";
import { usaElementosOpcionalesInicio } from "../../../api/app-api.js";
import {
  iniciarAgregarElementosPresenciaActiva,
  configurarAgregarElementosPresenciaActiva,
  debeAgregarElementosPresenciaActiva
} from "./componentes/agregar-elementos-presencia-activa/agregar-elementos-presencia-activa.js";

let ultimoFormularioInicia = null;
let ultimoOperativoInicia = null;

export async function iniciarFormularioInicia({
  operativoSeleccionado = null,
  getContexto,
  root = document
} = {}) {
  const form = root.querySelector?.(".formulario-inicia") || document.querySelector(".formulario-inicia");

  ultimoFormularioInicia = form;
  ultimoOperativoInicia = operativoSeleccionado || null;

  if (!form) {
    registrarInicioModulo({
      actual: null,
      errores: ["No se encontró el formulario de INICIA."],
      texto: "",
      supabasePayload: null
    });
    return;
  }

  configurarFormularioSegunOperativo(form, operativoSeleccionado);

  const catalogo = obtenerCatalogoRecursosInicio();
  const seleccionInicial = resolverSeleccionInicial(operativoSeleccionado);

  renderPersonalPolicial({
    host: form.querySelector("#inicioPersonalPolicialHost"),
    personal: catalogo.personal,
    seleccionInicial: seleccionInicial.personal,
    onChange: () => actualizarEstadoInicio({ form, operativoSeleccionado: ultimoOperativoInicia, getContexto })
  });

  renderMovilidad({
    host: form.querySelector("#inicioMovilidadHost"),
    moviles: catalogo.moviles,
    motos: catalogo.motos,
    seleccionInicial: {
      moviles: seleccionInicial.moviles,
      motos: seleccionInicial.motos
    },
    onChange: () => actualizarEstadoInicio({ form, operativoSeleccionado: ultimoOperativoInicia, getContexto })
  });

  renderElementos({
    host: form.querySelector("#inicioElementosHost"),
    grupos: catalogo.elementos,
    seleccionInicial: seleccionInicial.elementos,
    onChange: () => actualizarEstadoInicio({ form, operativoSeleccionado: ultimoOperativoInicia, getContexto })
  });

  await iniciarAgregarElementosPresenciaActiva({
    form,
    activo: usaElementosOpcionalesInicio(operativoSeleccionado, form.dataset.tipoOperativo),
    onChange: () => actualizarEstadoInicio({ form, operativoSeleccionado: ultimoOperativoInicia, getContexto })
  });

  iniciarObservacionesInicio({
    textarea: form.querySelector("#inicioObservaciones"),
    onChange: () => actualizarEstadoInicio({ form, operativoSeleccionado: ultimoOperativoInicia, getContexto })
  });

  await cargarFotosDeFormulario({
    form,
    contexto: {
      ...resolverContexto(getContexto),
      operativoSeleccionado
    }
  });

  const actualizar = () => actualizarEstadoInicio({
    form,
    operativoSeleccionado: ultimoOperativoInicia,
    getContexto
  });

  // El formulario es continuo. Nunca debe enviarse como submit HTML ni
  // recargarse por una validación incompleta.
  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("input", actualizar);
  form.addEventListener("change", actualizar);
  form.addEventListener("paste", () => setTimeout(actualizar, 0));

  actualizar();
}

export function obtenerFormularioIniciaActual() {
  return ultimoFormularioInicia;
}

export function obtenerOperativoIniciaActual() {
  return ultimoOperativoInicia;
}

export function actualizarOperativoFormularioInicia({
  operativoSeleccionado = null,
  getContexto
} = {}) {
  ultimoOperativoInicia = operativoSeleccionado || null;

  const form = ultimoFormularioInicia || document.querySelector(".formulario-inicia");
  if (!form) return false;

  configurarFormularioSegunOperativo(form, ultimoOperativoInicia);
  configurarAgregarElementosPresenciaActiva({
    form,
    activo: usaElementosOpcionalesInicio(ultimoOperativoInicia, form.dataset.tipoOperativo),
    reset: true
  });

  // IMPORTANTE: no se vuelve a renderizar el formulario. Se conserva todo lo
  // que el usuario ya marcó, escribió o fotografió y solo cambia el operativo
  // asociado al borrador actual.
  actualizarEstadoInicio({
    form,
    operativoSeleccionado: ultimoOperativoInicia,
    getContexto
  });

  return true;
}

function actualizarEstadoInicio({
  form,
  operativoSeleccionado,
  getContexto
}) {
  sincronizarCamposSerializados(form);

  const resultado = construirInicioDesdeFormulario({
    form,
    operativoSeleccionado,
    contexto: resolverContexto(getContexto)
  });


  registrarInicioModulo(resultado);
}

function sincronizarCamposSerializados(form) {
  if (!form) return;

  const personal = obtenerPersonalSeleccionado(form);
  const movilidad = obtenerMovilidadSeleccionada(form);
  const elementos = debeAgregarElementosPresenciaActiva(form)
    ? obtenerElementosSeleccionados(form)
    : {};
  const resumen = construirResumenRecursosInicio({
    personal,
    moviles: movilidad.moviles,
    motos: movilidad.motos,
    elementos
  });

  asignarCampo(form, "personal", resumen.personal);
  asignarCampo(form, "moviles_motos", resumen.moviles_motos);
  asignarCampo(form, "elementos", resumen.elementos);

  form.dataset.personalCantidad = String(personal.length);
  form.dataset.movilidadCantidad = String(movilidad.moviles.length + movilidad.motos.length);
}

function asignarCampo(form, nombre, valor) {
  const campo = form.querySelector(`[name="${nombre}"]`);
  if (campo) campo.value = String(valor || "");
}

function configurarFormularioSegunOperativo(form, operativo) {
  const tipo = normalizarTipo(
    operativo?.tipo_operativo ||
    operativo?.tipo_codigo ||
    "GENERICO"
  );

  form.dataset.tipoOperativo = tipo;
  form.dataset.operativoSeleccionado = operativo?.operativo_key || "";
  form.classList.toggle("sin-operativo-seleccionado", !operativo?.operativo_key);
}

function resolverSeleccionInicial(operativo) {
  const elementos = operativo?.elementos && typeof operativo.elementos === "object"
    ? operativo.elementos
    : {};

  return {
    personal: normalizarLista(operativo?.personal),
    moviles: normalizarLista(operativo?.moviles),
    motos: normalizarLista(operativo?.motos),
    elementos: {
      escopetas: normalizarLista(elementos.escopetas || elementos.ESCOPETA),
      ht: normalizarLista(elementos.ht || elementos.HT),
      pda: normalizarLista(elementos.pda || elementos.PDA),
      impresoras: normalizarLista(elementos.impresoras || elementos.IMPRESORA),
      alometros: normalizarLista(elementos.alometros || elementos.Alometro),
      alcoholimetros: normalizarLista(elementos.alcoholimetros || elementos.Alcoholimetro)
    }
  };
}

function resolverContexto(getContexto) {
  if (typeof getContexto !== "function") return {};

  try {
    return getContexto() || {};
  } catch {
    return {};
  }
}

function normalizarTipo(valor) {
  return String(valor || "GENERICO")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

function normalizarLista(items) {
  if (Array.isArray(items)) {
    return items.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof items === "string") {
    return items
      .split(/\r?\n|\s*\/\s*/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}
