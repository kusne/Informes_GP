import { registrarFinalizadoModulo } from "../../../api/app-api.js";
import { obtenerCatalogoRecursosOperativos, construirResumenRecursosOperativos } from "../../../api/app-api.js";
import { resolverRecursosInicioParaFinaliza } from "../../../api/app-api.js";
import { cargarFotosDeFormulario } from "../../servicios/fotos/fotos-formulario-loader.js";
import { cargarNumeralesFinaliza, limpiarNumeralesFinaliza } from "./numerales/numerales-finaliza.js";
import { construirFinalizadoDesdeFormulario } from "./compartido/finalizado-builder.js";
import { renderPersonalFinaliza, obtenerPersonalFinaliza, aplicarPersonalFinaliza } from "./componentes/personal-policial/personal-policial.js";
import { renderMovilidadFinaliza, obtenerMovilidadFinaliza, aplicarMovilidadFinaliza } from "./componentes/movilidad/movilidad.js";
import { renderElementosFinaliza, obtenerElementosFinaliza, aplicarElementosFinaliza } from "./componentes/elementos/elementos.js";
import { iniciarDetallesFinaliza } from "./componentes/detalles/detalles.js";
import { iniciarResultadosDinamicosFinaliza } from "./componentes/resultados-dinamicos/resultados-dinamicos.js";
import { usaControladosOpcionalesFinaliza } from "../../../api/app-api.js";
import { esOperativoPatrullaje } from "../../../api/app-api.js";
import { usaResultadosAssalControlArmas } from "../../../api/app-api.js";
import { iniciarAgregarControladosPresenciaActiva } from "./componentes/agregar-controlados-presencia-activa/agregar-controlados-presencia-activa.js";

let ultimoFormularioFinaliza = null;
let ultimoOperativoFinaliza = null;
let recursosInicioActual = null;

export async function iniciarFormularioFinaliza({
  operativoSeleccionado = null,
  getContexto,
  root = document
} = {}) {
  const form = root.querySelector?.(".formulario-finaliza") || document.querySelector(".formulario-finaliza");
  ultimoFormularioFinaliza = form;
  ultimoOperativoFinaliza = operativoSeleccionado || null;
  recursosInicioActual = resolverRecursosInicioParaFinaliza(ultimoOperativoFinaliza || {});

  if (!form) {
    registrarFinalizadoModulo({ actual: null, errores: ["No se encontró el formulario de FINALIZA."], texto: "", supabasePayload: null });
    return;
  }

  configurarFormularioSegunOperativo(form, ultimoOperativoFinaliza);
  configurarResultadosEspeciales(form, ultimoOperativoFinaliza);
  configurarMismosPorDefecto(form);

  const catalogo = obtenerCatalogoRecursosOperativos();
  renderPersonalFinaliza({
    host: form.querySelector("#finalizaPersonalPolicialHost"),
    personal: catalogo.personal,
    seleccionInicial: recursosInicioActual?.seleccionInicial?.personal || [],
    onChange: () => actualizarEstadoFinaliza({ form, operativoSeleccionado: ultimoOperativoFinaliza, getContexto })
  });
  renderMovilidadFinaliza({
    host: form.querySelector("#finalizaMovilidadHost"),
    moviles: catalogo.moviles,
    motos: catalogo.motos,
    seleccionInicial: {
      moviles: recursosInicioActual?.seleccionInicial?.moviles || [],
      motos: recursosInicioActual?.seleccionInicial?.motos || []
    },
    onChange: () => actualizarEstadoFinaliza({ form, operativoSeleccionado: ultimoOperativoFinaliza, getContexto })
  });
  renderElementosFinaliza({
    host: form.querySelector("#finalizaElementosHost"),
    grupos: catalogo.elementos,
    seleccionInicial: recursosInicioActual?.seleccionInicial?.elementos || {},
    onChange: () => actualizarEstadoFinaliza({ form, operativoSeleccionado: ultimoOperativoFinaliza, getContexto })
  });

  await iniciarAgregarControladosPresenciaActiva({
    form,
    activo: usaControladosOpcionalesFinaliza(ultimoOperativoFinaliza, form.dataset.tipoOperativo),
    onChange: () => actualizarEstadoFinaliza({ form, operativoSeleccionado: ultimoOperativoFinaliza, getContexto })
  });

  limpiarNumeralesFinaliza({ publicar: true });
  await cargarNumeralesFinaliza({
    form,
    contexto: { ...resolverContexto(getContexto), operativoSeleccionado: ultimoOperativoFinaliza },
    limpiar: false
  });

  await cargarFotosDeFormulario({
    form,
    contexto: { ...resolverContexto(getContexto), operativoSeleccionado: ultimoOperativoFinaliza }
  });

  configurarEventosMismos({ form, getContexto });
  configurarVerItems(form);
  iniciarDetallesFinaliza({
    textarea: form.querySelector("#finalizaDetalles"),
    onChange: () => actualizarEstadoFinaliza({ form, operativoSeleccionado: ultimoOperativoFinaliza, getContexto })
  });
  iniciarResultadosDinamicosFinaliza({
    form,
    onChange: () => actualizarEstadoFinaliza({ form, operativoSeleccionado: ultimoOperativoFinaliza, getContexto })
  });

  form.addEventListener("submit", (event) => event.preventDefault());
  const actualizar = () => actualizarEstadoFinaliza({ form, operativoSeleccionado: ultimoOperativoFinaliza, getContexto });
  form.addEventListener("input", actualizar);
  form.addEventListener("change", actualizar);
  form.addEventListener("paste", () => setTimeout(actualizar, 0));

  aplicarVisibilidadMismos(form);
  actualizar();
}

export function obtenerFormularioFinalizaActual() { return ultimoFormularioFinaliza; }
export function obtenerOperativoFinalizaActual() { return ultimoOperativoFinaliza; }

function configurarMismosPorDefecto(form) {
  for (const id of ["finalizaMismoPersonal", "finalizaMismoMoviles", "finalizaMismosElementos"]) {
    const input = form.querySelector(`#${id}`);
    if (input) input.checked = true;
  }
}

function configurarEventosMismos({ form, getContexto }) {
  const config = [
    {
      id: "finalizaMismoPersonal",
      restaurar: () => aplicarPersonalFinaliza(form, recursosInicioActual?.seleccionInicial?.personal || [])
    },
    {
      id: "finalizaMismoMoviles",
      restaurar: () => aplicarMovilidadFinaliza(form, {
        moviles: recursosInicioActual?.seleccionInicial?.moviles || [],
        motos: recursosInicioActual?.seleccionInicial?.motos || []
      })
    },
    {
      id: "finalizaMismosElementos",
      restaurar: () => aplicarElementosFinaliza(form, recursosInicioActual?.seleccionInicial?.elementos || {})
    }
  ];

  for (const item of config) {
    const check = form.querySelector(`#${item.id}`);
    if (!check) continue;
    check.addEventListener("change", () => {
      // Al pasar de "mismo..." a edición manual se parte SIEMPRE de lo que
      // tenía asignado el INICIA. El usuario modifica solo lo necesario.
      if (!check.checked) item.restaurar();
      aplicarVisibilidadMismos(form);
      actualizarEstadoFinaliza({ form, operativoSeleccionado: ultimoOperativoFinaliza, getContexto });
    });
  }
}

function aplicarVisibilidadMismos(form) {
  const reglas = [
    ["#finalizaMismoPersonal", "#finalizaPersonalPolicialHost"],
    ["#finalizaMismoMoviles", "#finalizaMovilidadHost"],
    ["#finalizaMismosElementos", "#finalizaElementosHost"]
  ];
  for (const [checkSel, hostSel] of reglas) {
    const check = form.querySelector(checkSel);
    const host = form.querySelector(hostSel);
    host?.classList.toggle("hidden", Boolean(check?.checked));
  }
}

function configurarVerItems(form) {
  const check = form.querySelector("#finalizaVerItems");
  const host = form.querySelector("#finalizaNumeralesHost");
  if (!check || !host) return;
  const aplicar = () => host.classList.toggle("hidden", !check.checked);
  check.addEventListener("change", aplicar);
  aplicar();
}

function actualizarEstadoFinaliza({ form, operativoSeleccionado, getContexto }) {
  sincronizarRecursosFinaliza(form);
  const resultado = construirFinalizadoDesdeFormulario({
    form,
    operativoSeleccionado,
    contexto: resolverContexto(getContexto)
  });
  registrarFinalizadoModulo(resultado);
}

function sincronizarRecursosFinaliza(form) {
  const mismoPersonal = Boolean(form.querySelector("#finalizaMismoPersonal")?.checked);
  const mismosMoviles = Boolean(form.querySelector("#finalizaMismoMoviles")?.checked);
  const mismosElementos = Boolean(form.querySelector("#finalizaMismosElementos")?.checked);

  const manualPersonal = obtenerPersonalFinaliza(form);
  const manualMovilidad = obtenerMovilidadFinaliza(form);
  const manualElementos = obtenerElementosFinaliza(form);
  const manual = construirResumenRecursosOperativos({
    personal: manualPersonal,
    moviles: manualMovilidad.moviles,
    motos: manualMovilidad.motos,
    elementos: manualElementos
  });

  asignarCampo(form, "personal", mismoPersonal ? recursosInicioActual?.personal : manual.personal);
  asignarCampo(form, "moviles_motos", mismosMoviles ? recursosInicioActual?.moviles_motos : manual.moviles_motos);
  asignarCampo(form, "elementos", mismosElementos ? recursosInicioActual?.elementos : manual.elementos);

  form.dataset.fuentePersonal = mismoPersonal ? "INICIO" : "FINALIZADO_MANUAL";
  form.dataset.fuenteMovilidad = mismosMoviles ? "INICIO" : "FINALIZADO_MANUAL";
  form.dataset.fuenteElementos = mismosElementos ? "INICIO" : "FINALIZADO_MANUAL";
}

function asignarCampo(form, nombre, valor) {
  const campo = form.querySelector(`[name="${nombre}"]`);
  if (campo) campo.value = String(valor || "");
}

function configurarFormularioSegunOperativo(form, operativo) {
  const tipo = normalizarTipo(operativo?.tipo_operativo || operativo?.tipo_codigo || "GENERICO");
  form.dataset.tipoOperativo = tipo;
  form.dataset.operativoSeleccionado = operativo?.operativo_key || "";
}

function configurarResultadosEspeciales(form, operativo) {
  const esPatrullaje = esOperativoPatrullaje(operativo, form.dataset.tipoOperativo);
  const conAssalArmas = usaResultadosAssalControlArmas(operativo, form.dataset.tipoOperativo);

  configurarCampoResultadoEspecial(form, "#finalizaWrapDecreto460", "decreto_460_22", esPatrullaje);
  configurarCampoResultadoEspecial(form, "#finalizaWrapAssal", "assal", conAssalArmas);
  configurarCampoResultadoEspecial(form, "#finalizaWrapControlArmas", "control_armas", conAssalArmas);
}

function configurarCampoResultadoEspecial(form, wrapSelector, nombreCampo, visible) {
  const wrap = form.querySelector(wrapSelector);
  const input = form.querySelector(`[name="${nombreCampo}"]`);

  wrap?.classList.toggle("hidden", !visible);

  // Evita que un valor residual de otro operativo se publique por error.
  if (!visible && input) input.value = "";
}

function resolverContexto(getContexto) {
  if (typeof getContexto !== "function") return {};
  try { return getContexto() || {}; } catch { return {}; }
}

function normalizarTipo(valor) {
  return String(valor || "GENERICO").trim().toUpperCase().replaceAll("-", "_").replace(/\s+/g, "_");
}
