import { cargarComponenteHtml } from "../../servicios/ui/cargar-componente-html.js";
import { resolverRutaApp } from "../../servicios/rutas/rutas-app.js";
import { obtenerOperativosPorModo } from "../../../api/app-api.js";
import { obtenerOperativosDisponibles46022 } from "../../../api/decreto-460-22-api.js";
import {
  obtenerModeloInformeGP,
  normalizarModeloInforme
} from "./modelos-informes.js";
import {
  iniciarModeloInformeEspecial,
  actualizarOperativoInformeEspecial
} from "./compartido/informe-especial-builder.js";

let estadoInforme = {
  modelo: null,
  operativoSeleccionado: null,
  operativos: [],
  estadoGuardia46022: "SIN_GUARDIA",
  guardiaFecha46022: ""
};
let detenerVigilancia46022 = null;
let secuenciaConsulta46022 = 0;

export async function iniciarModuloInformes({
  hostSelector = "#informesModuloHost",
  modeloInformeSeleccionado = null,
  modeloInicial = "",
  getContexto
} = {}) {
  const host = document.querySelector(hostSelector);

  if (!host) return;
  detenerVigilancia46022?.();
  detenerVigilancia46022 = null;
  secuenciaConsulta46022 += 1;

  const modeloKey = normalizarModeloInforme(
    modeloInformeSeleccionado?.modelo_key ||
    modeloInformeSeleccionado?.codigo ||
    modeloInicial
  );

  const modelo = obtenerModeloInformeGP(modeloKey);

  estadoInforme = {
    modelo,
    operativoSeleccionado: null,
    operativos: [],
    estadoGuardia46022: "SIN_GUARDIA",
    guardiaFecha46022: ""
  };

  if (!modelo) {
    host.innerHTML = `
      <section class="pantalla-mensaje error-formulario">
        <h2>INFORMES</h2>
        <p>No se seleccionó un modelo de informe válido.</p>
      </section>
    `;
    return;
  }

  if (!host.querySelector("#informeOperativoSelectorHost")) {
    host.innerHTML = await cargarComponenteHtml("/frontend/pantallas/informes/informes.html");
  }

  await cargarOperativosInternos();
  renderSelectorOperativoInterno({
    host,
    getContexto
  });

  await renderFormularioInforme({
    host,
    getContexto
  });

  if (esDecreto46022()) iniciarVigilancia46022(host);
}

export const iniciarInformes = iniciarModuloInformes;
export const iniciarInformesEspeciales = iniciarModuloInformes;

async function cargarOperativosInternos() {
  if (esDecreto46022()) {
    const resultado = await obtenerOperativosDisponibles46022();
    estadoInforme.operativos = resultado.operativos;
    estadoInforme.estadoGuardia46022 = resultado.estado;
    estadoInforme.guardiaFecha46022 = resultado.guardiaFecha || "";
    return;
  }
  try {
    estadoInforme.operativos = await obtenerOperativosPorModo(
      estadoInforme.modelo?.codigo === "PROCEDIMIENTO" ? "PROCEDIMIENTO" : "INFORMES"
    );
  } catch (error) {
    console.error("[Informes_GP] No se pudieron leer los últimos operativos iniciados para informe:", error);
    estadoInforme.operativos = [];
  }
}

function renderSelectorOperativoInterno({
  host,
  getContexto
}) {
  const contenedor = host.querySelector("#informeOperativoSelectorHost");

  if (!contenedor) return;

  const operativos = estadoInforme.operativos;
  const es460 = esDecreto46022();

  contenedor.innerHTML = `
    <section class="informe-operativo-interno">
      <h3>${escapeHtml(estadoInforme.modelo?.nombre || "INFORME")}</h3>
      ${es460 ? "" : '<label for="selectorOperativoDentroInforme">Últimos Operativos</label>'}

      <select id="selectorOperativoDentroInforme" aria-label="Seleccionar operativo para el informe" ${operativos.length ? "" : "disabled"}>
        <option value="">${operativos.length ? "Seleccione Operativo" : es460 ? "No hay operativos de guardia disponibles" : "No hay operativos disponibles"}</option>
        ${operativos.map((op) => `
          <option value="${escapeHtml(op.operativo_key)}">
            ${escapeHtml(construirEtiquetaOperativo(op))}
          </option>
        `).join("")}
      </select>

      <p class="informe-operativo-ayuda" role="status">
        ${es460 ? mensajeGuardia46022() : operativos.length ? "Puede seleccionar un operativo aunque ya esté FINALIZADO." : "Todavía no hay operativos que hayan sido iniciados para vincular el informe."}
      </p>
      ${es460 ? '<button type="button" id="btnActualizarOperativos46022">Actualizar operativos</button>' : ""}
    </section>
  `;

  const selector = contenedor.querySelector("#selectorOperativoDentroInforme");

  selector?.addEventListener("change", async () => {
    const claveElegida = selector.value;
    if (es460) {
      // Antes de confirmar, volver a verificar la guardia sin perder la selección:
      // la recarga puede reconstruir el <select> durante el evento change.
      await refrescarOperativos46022(host, { claveSolicitada: claveElegida });
      if (!esDecreto46022() || !host.isConnected) return;
    }
    estadoInforme.operativoSeleccionado = estadoInforme.operativos.find((op) =>
      String(op.operativo_key) === claveElegida &&
      (!es460 || String(op.guardia_fecha) === String(estadoInforme.guardiaFecha46022))
    ) || null;
    const selectorVigente = host.querySelector("#selectorOperativoDentroInforme");
    if (selectorVigente) selectorVigente.value = estadoInforme.operativoSeleccionado?.operativo_key || "";

    // No reconstruir el formulario: elegir/cambiar el operativo nunca debe borrar
    // lo que el usuario ya escribió ni las fotos que ya seleccionó.
    const formHost = host.querySelector("#informeEspecialHost");
    const form =
      formHost?.querySelector("form") ||
      formHost?.querySelector("[data-modelo-informe]") ||
      formHost?.firstElementChild;

    actualizarOperativoInformeEspecial({
      form,
      operativoSeleccionado: estadoInforme.operativoSeleccionado
    });
  });
  contenedor.querySelector("#btnActualizarOperativos46022")?.addEventListener("click", async (evento) => {
    const boton = evento.currentTarget;
    if (boton?.disabled) return;
    boton.disabled = true;
    try {
      await refrescarOperativos46022(host, { forzar: true });
    } finally {
      if (boton.isConnected) boton.disabled = false;
    }
  });
}

async function renderFormularioInforme({
  host,
  getContexto
}) {
  const formHost = host.querySelector("#informeEspecialHost");

  if (!formHost) return;

  const modelo = estadoInforme.modelo;

  if (!modelo) {
    formHost.innerHTML = "";
    return;
  }

  try {
    formHost.innerHTML = await cargarComponenteHtml(modelo.html);
  } catch (error) {
    formHost.innerHTML = `
      <section class="pantalla-mensaje error-formulario">
        <h2>Error cargando ${escapeHtml(modelo.nombre)}</h2>
        <p>${escapeHtml(error?.message || String(error))}</p>
      </section>
    `;
    return;
  }

  const form =
    formHost.querySelector("form") ||
    formHost.querySelector("[data-modelo-informe]") ||
    formHost.firstElementChild;

  if (!form) {
    formHost.innerHTML = `
      <section class="pantalla-mensaje error-formulario">
        <h2>Error en informe</h2>
        <p>No se encontró formulario para ${escapeHtml(modelo.nombre)}.</p>
      </section>
    `;
    return;
  }

  if (modelo.modulo) {
    try {
      const moduloUI = await import(resolverRutaApp(modelo.modulo));
      if (typeof moduloUI.iniciarModeloInformeUI === "function") {
        await moduloUI.iniciarModeloInformeUI({
          form,
          operativoSeleccionado: estadoInforme.operativoSeleccionado,
          getContexto
        });
      }
    } catch (error) {
      console.error(`[Informes_GP] No se pudo iniciar UI de ${modelo.codigo}:`, error);
    }
  }

  await iniciarModeloInformeEspecial({
    form,
    modelo: modelo.codigo,
    operativoSeleccionado: estadoInforme.operativoSeleccionado,
    getOperativoSeleccionado: () => estadoInforme.operativoSeleccionado,
    getContexto
  });
}

function esDecreto46022() {
  return estadoInforme.modelo?.codigo === "DECRETO_460_22";
}

function mensajeGuardia46022() {
  const estado = estadoInforme.estadoGuardia46022;
  if (estado === "FINALIZADA") return "La guardia fue cerrada en BMZCN Desktop.";
  if (estado === "BLOQUEO_PREVENTIVO") return "Guardia bloqueada preventivamente en BMZCN Desktop.";
  if (estado === "SIN_VERIFICAR") return "No se pudo verificar el cierre de guardia en BMZCN Desktop.";
  if (estado === "SIN_GUARDIA") return "No hay una guardia vigente confirmada por BMZCN Desktop.";
  const fecha = estadoInforme.guardiaFecha46022 || "actual";
  return estadoInforme.operativos.length
    ? `Guardia ${fecha}: todos los operativos EN CURSO y los dos últimos FINALIZADOS de esta misma guardia.`
    : `Guardia ${fecha} vigente, pero sin operativos iniciados registrados. Primero registrá INICIO en Informes GP y después pulsá «Actualizar operativos». No se utilizan operativos de guardias cerradas.`;
}

async function refrescarOperativos46022(host, { forzar = false, claveSolicitada = "" } = {}) {
  if (!esDecreto46022() || !host?.isConnected) return;
  const secuencia = ++secuenciaConsulta46022;
  const resultado = await obtenerOperativosDisponibles46022();
  // Un cambio de pantalla u otra consulta más nueva invalida esta respuesta.
  if (secuencia !== secuenciaConsulta46022 || !esDecreto46022() || !host?.isConnected) return;
  const antes = estadoInforme.operativos.map(op => [
    op.guardia_fecha, op.operativo_key, op.estado, op.lugar, op.tipo_nombre
  ].join("|")).join(";");
  const despues = resultado.operativos.map(op => [
    op.guardia_fecha, op.operativo_key, op.estado, op.lugar, op.tipo_nombre
  ].join("|")).join(";");
  const cambio = antes !== despues ||
    estadoInforme.estadoGuardia46022 !== resultado.estado ||
    estadoInforme.guardiaFecha46022 !== (resultado.guardiaFecha || "");

  const seleccionAnterior = estadoInforme.operativoSeleccionado;
  // Priorizar la selección realizada por el usuario mientras ocurría la consulta.
  const clave = String(claveSolicitada || seleccionAnterior?.operativo_key || "");
  const guardia = String(claveSolicitada
    ? estadoInforme.guardiaFecha46022
    : seleccionAnterior?.guardia_fecha || "");
  estadoInforme.operativos = resultado.operativos;
  estadoInforme.estadoGuardia46022 = resultado.estado;
  estadoInforme.guardiaFecha46022 = resultado.guardiaFecha || "";
  const vigente = estadoInforme.operativos.find(op =>
    String(op.operativo_key) === clave &&
    String(op.guardia_fecha) === guardia &&
    String(op.guardia_fecha) === String(estadoInforme.guardiaFecha46022)
  ) || null;
  estadoInforme.operativoSeleccionado = vigente;

  if (cambio || forzar) {
    renderSelectorOperativoInterno({ host });
  }
  const selector = host.querySelector("#selectorOperativoDentroInforme");
  if (selector) selector.value = vigente?.operativo_key || "";

  if (seleccionAnterior && !vigente) {
    const formHost = host.querySelector("#informeEspecialHost");
    const form = formHost?.querySelector("form") ||
      formHost?.querySelector("[data-modelo-informe]") ||
      formHost?.firstElementChild;
    actualizarOperativoInformeEspecial({ form, operativoSeleccionado: null });
  }
}

function iniciarVigilancia46022(host) {
  let activa = true;
  let verificando = false;
  const refrescar = async () => {
    if (!activa || verificando || document.visibilityState === "hidden") return;
    verificando = true;
    try { await refrescarOperativos46022(host); }
    finally { verificando = false; }
  };
  const recuperar = () => { if (document.visibilityState === "visible") void refrescar(); };
  const intervalo = setInterval(() => void refrescar(), 15000);
  document.addEventListener("visibilitychange", recuperar);
  window.addEventListener("focus", recuperar);
  detenerVigilancia46022 = () => {
    activa = false;
    clearInterval(intervalo);
    document.removeEventListener("visibilitychange", recuperar);
    window.removeEventListener("focus", recuperar);
  };
}

function construirEtiquetaOperativo(op = {}) {
  const horario = op.franja_horaria || construirFranja(op.hora_inicio, op.hora_fin) || "SIN HORARIO";
  const lugar = op.lugar || op.qth || op.ubicacion || "SIN LUGAR";
  const tipo = String(op.tipo_nombre || op.tipo_operativo || "OPERATIVO").replaceAll("_", " ");

  return `${horario} - ${lugar} - ${tipo}`;
}

function construirFranja(inicio, fin) {
  const i = String(inicio || "").trim();
  const f = String(fin || "").trim();

  if (i && f) return /FINALIZAR/i.test(f) ? `${i} A FINALIZAR` : `${i} A ${f} HS`;
  if (i) return `${i} HS`;

  return "";
}

function escapeHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
