import { listarModelosInformesGP } from "../informes/modelos-informes.js";
import { renderAvisoModoEnsayo } from "./componentes/aviso-modo-ensayo/aviso-modo-ensayo.js";
import { modoEnsayoActivo } from "../../../backend/infraestructura/ensayo/modo-ensayo.js";

const estadoPantalla = {
  modo: "",
  operativoSeleccionado: null,
  modeloInformeSeleccionado: null,
  cantidadOperativos: 0,
  operativosDisponibles: [],
  modelosInformesDisponibles: []
};

let listenerEnvioRegistrado = false;
let listenerRealtimeRegistrado = false;
let listenerModeloInformeRegistrado = false;
let listenerVolverInformesRegistrado = false;
let timeoutRefresco = null;

const ID_HOST_PANTALLA_PRINCIPAL = "pantallaPrincipalHost";
const ID_PAGINA_DETALLE_INFORME = "informeDetallePaginaHost";

export async function iniciarPantallaPrincipal({ hostSelector }) {
  const host = document.querySelector(hostSelector);

  if (!host) {
    throw new Error(`No se encontró host de pantalla principal: ${hostSelector}`);
  }

  await iniciarCoordinadorSeguro();

  // El markup principal puede venir ya pintado desde index.html para evitar
  // una pantalla vacía mientras GitHub Pages descarga módulos.
  if (!host.querySelector(".pantalla-principal")) {
    host.innerHTML = await cargarHtmlPantallaPrincipalSeguro();
  }

  await renderAvisoModoEnsayo({
    hostSelector: "#avisoModoEnsayoHost"
  });

  await iniciarSelectorModoSeguro();

  registrarListenerPostEnvio();
  registrarListenerModeloInforme();
  registrarListenerVolverInformes();

  // INICIA es el modo operativo por defecto. Así el contador y el selector
  // se cargan apenas abre la aplicación, sin exigir una selección previa.
  const selectorModo = document.querySelector("#selectorModoInformeSelect, #selectorModoInforme");
  if (selectorModo) selectorModo.value = "INICIA";

  // INICIA se pinta y consulta en paralelo. La interfaz local no debe esperar a
  // Supabase para aparecer. Realtime se difiere hasta que el arranque crítico
  // ya terminó para que el CDN/WebSocket no compita con la primera pantalla.
  await cambiarModoPantalla("INICIA");

  if (!modoEnsayoActivo()) {
    registrarListenerRealtime();
    programarRealtimeSeguro();
  }
}

async function cambiarModoPantalla(modo) {
  salirVistaDetalleInformes();
  estadoPantalla.modo = normalizarModo(modo);
  estadoPantalla.operativoSeleccionado = null;
  estadoPantalla.modeloInformeSeleccionado = null;

  await registrarModoSeguro(estadoPantalla.modo);
  await registrarOperativoSeguro(null);

  await recargarItemsPantalla({
    motivo: "cambio-modo"
  });
}

async function recargarItemsPantalla({
  motivo = ""
} = {}) {
  const modo = estadoPantalla.modo;

  estadoPantalla.operativoSeleccionado = null;
  estadoPantalla.modeloInformeSeleccionado = null;

  await registrarOperativoSeguro(null);

  let items = [];

  // El formulario INICIA es completamente local. Se empieza a construir de
  // inmediato mientras viaja la consulta de operativos. Antes esta pantalla
  // quedaba esperando a Supabase y daba sensación de app bloqueada.
  const renderLocalInicial = modo === "INICIA"
    ? renderContenedorSeguro({
        modo,
        operativoSeleccionado: null,
        modeloInformeSeleccionado: null
      })
    : null;

  if (modo === "INFORMES") {
    items = listarModelosInformesGP();
    estadoPantalla.modelosInformesDisponibles = items;
    estadoPantalla.operativosDisponibles = [];
  } else {
    items = await obtenerOperativosSeguro(modo);
    estadoPantalla.operativosDisponibles = items;
    estadoPantalla.modelosInformesDisponibles = [];
  }

  // Esperamos el montaje local sólo después de que ambas tareas ya corrieron
  // en paralelo. Evita la carrera de selección sin volver al arranque serial.
  if (renderLocalInicial) {
    await renderLocalInicial;
  }

  estadoPantalla.cantidadOperativos = items.length;

  aplicarPresentacionSegunModo(modo);

  await registrarOperativosDisponiblesSeguro({
    modo,
    operativos: modo === "INFORMES" ? [] : items
  });

  actualizarTituloContador(modo);

  if (modo !== "INFORMES") {
    await renderContadorSeguro(estadoPantalla.cantidadOperativos);

    await renderSelectorOperativoSeguro({
      modo,
      items
    });
  } else {
    const selectorHost = document.querySelector("#selectorOperativoContextualHost");
    if (selectorHost) selectorHost.innerHTML = "";
  }

  if (!renderLocalInicial) {
    if (modo === "INFORMES") {
      const hostDinamico = document.querySelector("#contenedorDinamicoHost");
      if (hostDinamico) hostDinamico.innerHTML = "";
    } else {
      await renderContenedorSeguro({
        modo,
        operativoSeleccionado: null,
        modeloInformeSeleccionado: null
      });
    }
  }

  if (motivo) {
    console.log("[Informes_GP] Pantalla refrescada:", motivo);
  }
}

function recargarItemsDebounce(motivo) {
  if (timeoutRefresco) {
    clearTimeout(timeoutRefresco);
  }

  timeoutRefresco = setTimeout(async () => {
    timeoutRefresco = null;

    if (!estadoPantalla.modo) return;

    await recargarItemsPantalla({
      motivo
    });
  }, 500);
}

async function cargarHtmlPantallaPrincipalSeguro() {
  try {
    const ui = await import("../../servicios/ui/cargar-componente-html.js");

    if (typeof ui.cargarComponenteHtml === "function") {
      return await ui.cargarComponenteHtml("/frontend/pantallas/pantalla-principal/pantalla-principal.html");
    }
  } catch (error) {
    console.warn("[Informes_GP] No se pudo cargar pantalla-principal.html. Se usa fallback.", error);
  }

  return `
    <section class="pantalla-principal">
      <div id="avisoModoEnsayoHost" class="hidden"></div>

      <section class="pantalla-principal-card pantalla-principal-selector-card">
        <div id="selectorModoInformeHost"></div>
      </section>

      <section class="pantalla-principal-card pantalla-principal-operativos-card">
        <div class="pantalla-principal-contador-linea">
          <h2 id="tituloContadorOperativos">OPERATIVOS</h2>
          <div id="contadorOperativosHost"></div>
        </div>

        <div id="selectorOperativoContextualHost"></div>
      </section>

      <section id="contenedorDinamicoHost" class="pantalla-principal-dinamico"></section>
    </section>
  `;
}

async function iniciarSelectorModoSeguro() {
  try {
    const modulo = await import("./componentes/selector-modo-informe/selector-modo-informe.js");

    if (typeof modulo.iniciarSelectorModoInforme !== "function") {
      throw new Error("selector-modo-informe.js no exporta iniciarSelectorModoInforme.");
    }

    await modulo.iniciarSelectorModoInforme({
      hostSelector: "#selectorModoInformeHost",
      onChange: async (modo) => {
        await cambiarModoPantalla(modo);
      }
    });
  } catch (error) {
    console.error("[Informes_GP] Error cargando selector modo:", error);

    const host = document.querySelector("#selectorModoInformeHost");
    if (!host) return;

    host.innerHTML = `
      <div class="selector-modo-informe">
        <label for="selectorModoInforme">Informes</label>
        <select id="selectorModoInforme">
          <option value="INICIA" selected>INICIA</option>
          <option value="FINALIZA">FINALIZA</option>
          <option value="INFORMES">INFORMES</option>
          <option value="CONTROL_MOVILES">CONTROL DE MÓVILES</option>
        </select>
      </div>
    `;

    const selector = host.querySelector("#selectorModoInforme");
    selector?.addEventListener("change", async () => {
      await cambiarModoPantalla(selector.value);
    });
  }
}

async function renderContadorSeguro(cantidad) {
  try {
    const modulo = await import("./componentes/contador-operativos/contador-operativos.js");

    if (typeof modulo.renderContadorOperativos === "function") {
      await modulo.renderContadorOperativos("#contadorOperativosHost", cantidad);
      return;
    }
  } catch (error) {
    console.warn("[Informes_GP] Error cargando contador. Se usa fallback.", error);
  }

  const host = document.querySelector("#contadorOperativosHost");
  if (host) {
    host.innerHTML = `<div class="contador-operativos"><span>${Number(cantidad || 0)}</span></div>`;
  }
}

async function renderSelectorOperativoSeguro({
  modo,
  items
}) {
  try {
    const modulo = await import("./componentes/selector-operativo-contextual/selector-operativo-contextual.js");

    if (typeof modulo.renderSelectorOperativoContextual === "function") {
      await modulo.renderSelectorOperativoContextual({
        hostSelector: "#selectorOperativoContextualHost",
        modo,
        operativosIniciales: items,
        onChange: async (item) => {
          if (estadoPantalla.modo === "INFORMES") {
            estadoPantalla.modeloInformeSeleccionado = item;
            estadoPantalla.operativoSeleccionado = null;

            await renderContenedorSeguro({
              modo: estadoPantalla.modo,
              operativoSeleccionado: null,
              modeloInformeSeleccionado: item
            });

            return;
          }

          estadoPantalla.operativoSeleccionado = item;
          estadoPantalla.modeloInformeSeleccionado = null;

          await registrarOperativoSeguro(item);

          if (estadoPantalla.modo === "INICIA") {
            const actualizado = await actualizarOperativoIniciaSinRerenderSeguro(item);
            if (actualizado) return;
          }

          await renderContenedorSeguro({
            modo: estadoPantalla.modo,
            operativoSeleccionado: item,
            modeloInformeSeleccionado: null
          });
        }
      });

      return;
    }
  } catch (error) {
    console.error("[Informes_GP] Error cargando selector contextual:", error);
  }

  renderSelectorFallback({
    modo,
    items
  });
}

function renderSelectorFallback({
  modo,
  items
}) {
  const host = document.querySelector("#selectorOperativoContextualHost");
  if (!host) return;

  if (modo === "CONTROL_MOVILES") {
    host.innerHTML = `
      <div class="selector-operativo-contextual">
        <label>Control de móviles</label>
        <select disabled><option>Control de móviles no requiere operativo.</option></select>
      </div>
    `;
    return;
  }

  const placeholder = modo === "INFORMES" ? "Seleccionar informe" : "Seleccionar operativo";

  host.innerHTML = `
    <div class="selector-operativo-contextual">
      <label>${modo === "INFORMES" ? "Modelos de informes" : "Operativo / franja horaria"}</label>
      <select id="selectorContextualFallback">
        <option value="">${items.length ? placeholder : "No hay opciones disponibles"}</option>
        ${items.map((item) => `<option value="${escapeHtml(item.operativo_key || item.modelo_key)}">${escapeHtml(item.label || item.etiqueta || construirEtiqueta(item))}</option>`).join("")}
      </select>
    </div>
  `;

  const selector = host.querySelector("#selectorContextualFallback");

  selector?.addEventListener("change", async () => {
    const item = items.find((x) => String(x.operativo_key || x.modelo_key) === selector.value) || null;

    if (modo === "INFORMES") {
      estadoPantalla.modeloInformeSeleccionado = item;

      await renderContenedorSeguro({
        modo,
        operativoSeleccionado: null,
        modeloInformeSeleccionado: item
      });

      return;
    }

    estadoPantalla.operativoSeleccionado = item;
    await registrarOperativoSeguro(item);

    if (modo === "INICIA") {
      const actualizado = await actualizarOperativoIniciaSinRerenderSeguro(item);
      if (actualizado) return;
    }

    await renderContenedorSeguro({
      modo,
      operativoSeleccionado: item,
      modeloInformeSeleccionado: null
    });
  });
}

async function actualizarOperativoIniciaSinRerenderSeguro(operativoSeleccionado) {
  try {
    const modulo = await import("../inicia/inicia.js");

    if (typeof modulo.actualizarOperativoFormularioInicia !== "function") {
      return false;
    }

    return Boolean(modulo.actualizarOperativoFormularioInicia({
      operativoSeleccionado,
      getContexto
    }));
  } catch (error) {
    console.warn("[Informes_GP] No se pudo asociar el operativo a INICIA sin rerender.", error);
    return false;
  }
}

async function renderContenedorSeguro({
  modo,
  operativoSeleccionado,
  modeloInformeSeleccionado
}) {
  const esDetalleInforme = normalizarModo(modo) === "INFORMES" && Boolean(modeloInformeSeleccionado);
  const hostSelector = esDetalleInforme
    ? `#${ID_PAGINA_DETALLE_INFORME}`
    : "#contenedorDinamicoHost";

  if (esDetalleInforme) {
    asegurarPaginaDetalleInformes();
  }

  try {
    const modulo = await import("./componentes/contenedor-dinamico/contenedor-dinamico.js");

    if (typeof modulo.renderContenedorDinamico !== "function") {
      throw new Error("contenedor-dinamico.js no exporta renderContenedorDinamico.");
    }

    await modulo.renderContenedorDinamico({
      hostSelector,
      modo,
      operativoSeleccionado,
      modeloInformeSeleccionado,
      getContexto
    });
  } catch (error) {
    console.error("[Informes_GP] Error cargando contenedor dinámico:", error);

    const host = document.querySelector(hostSelector);
    if (!host) return;

    host.innerHTML = `
      <section class="pantalla-mensaje error-formulario">
        <h2>Error en módulo dinámico</h2>
        <p>${escapeHtml(error?.message || String(error))}</p>
        <pre class="error-detalle-arranque">${escapeHtml(error?.stack || "")}</pre>
      </section>
    `;
  }
}

async function obtenerOperativosSeguro(modo) {
  if (!modo || modo === "CONTROL_MOVILES" || modo === "INFORMES") {
    return [];
  }

  try {
    const modulo = await import("../../../backend/aplicacion/operativos/operativos.js");

    if (typeof modulo.obtenerOperativosPorModo !== "function") {
      throw new Error("06_Operativos/operativos.js no exporta obtenerOperativosPorModo.");
    }

    return await modulo.obtenerOperativosPorModo(modo);
  } catch (error) {
    console.error("[Informes_GP] Error leyendo operativos:", error);
    return [];
  }
}

function programarRealtimeSeguro() {
  const iniciar = () => iniciarRealtimeSeguro();

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(iniciar, { timeout: 2500 });
    return;
  }

  setTimeout(iniciar, 1500);
}

function iniciarRealtimeSeguro() {
  import("../../../backend/infraestructura/supabase/supabase-realtime.js")
    .then((modulo) => {
      if (typeof modulo.iniciarRealtimeInformesGP === "function") {
        modulo.iniciarRealtimeInformesGP({
          guardia_fecha: window.InformesGP?.guardiaFecha || "",
          onCambio: (detalle) => manejarCambioSupabase(detalle)
        });
      }
    })
    .catch((error) => {
      console.warn("[Informes_GP] Realtime desactivado por error:", error);
    });
}

function aplicarPresentacionSegunModo(modo) {
  const esInformes = normalizarModo(modo) === "INFORMES";
  const tituloContador = document.querySelector(".operativos-title-row");
  const selectorContextual = document.querySelector("#selectorOperativoContextualHost");

  if (tituloContador) {
    if (esInformes) tituloContador.style.setProperty("display", "none", "important");
    else tituloContador.style.removeProperty("display");
  }

  if (selectorContextual) {
    if (esInformes) selectorContextual.style.setProperty("display", "none", "important");
    else selectorContextual.style.removeProperty("display");
  }
}

function registrarListenerModeloInforme() {
  if (listenerModeloInformeRegistrado) return;
  listenerModeloInformeRegistrado = true;

  document.addEventListener("igp:modelo-informe-seleccionado", async (event) => {
    if (estadoPantalla.modo !== "INFORMES") return;

    const id = normalizarModeloDesdeTarjeta(event?.detail?.id || event?.detail?.modelo_key || event?.detail?.codigo || "");
    const item = estadoPantalla.modelosInformesDisponibles.find((modelo) => {
      const key = normalizarModeloDesdeTarjeta(modelo?.modelo_key || modelo?.codigo || "");
      return key === id;
    }) || null;

    if (!item) {
      console.warn("[Informes_GP] Tarjeta de informe sin modelo registrado:", event?.detail);
      // Si compatibilidad ya cambió de superficie pero el modelo no coincide,
      // restauramos la página de tarjetas para no dejar una pantalla vacía.
      salirVistaDetalleInformes();
      return;
    }

    estadoPantalla.modeloInformeSeleccionado = item;
    estadoPantalla.operativoSeleccionado = null;

    // CAMBIO DE PÁGINA ANTES DE CUALQUIER await.
    entrarVistaDetalleInformes();

    await renderContenedorSeguro({
      modo: "INFORMES",
      operativoSeleccionado: null,
      modeloInformeSeleccionado: item
    });
  });
}

function registrarListenerVolverInformes() {
  if (listenerVolverInformesRegistrado) return;
  listenerVolverInformesRegistrado = true;

  window.addEventListener("informesgp:volver-modelos-informes", async () => {
    if (estadoPantalla.modo !== "INFORMES") return;
    await volverATarjetasInformes();
  });
}

function asegurarPaginaDetalleInformes() {
  let pagina = document.getElementById(ID_PAGINA_DETALLE_INFORME);
  if (pagina) return pagina;

  pagina = document.createElement("section");
  pagina.id = ID_PAGINA_DETALLE_INFORME;
  pagina.className = "informe-detalle-pagina-host";
  pagina.hidden = true;
  pagina.setAttribute("aria-hidden", "true");

  const principal = document.getElementById(ID_HOST_PANTALLA_PRINCIPAL);
  const shell = principal?.parentElement || document.getElementById("app") || document.body;
  shell.appendChild(pagina);
  return pagina;
}

function entrarVistaDetalleInformes() {
  const principal = document.getElementById(ID_HOST_PANTALLA_PRINCIPAL);
  const pagina = asegurarPaginaDetalleInformes();
  const panelModelos = document.getElementById("igp-panel-modelos-informes");

  if (panelModelos) panelModelos.hidden = true;

  // No ocultamos partes: se apaga COMPLETO el host de selector/tarjetas.
  if (principal) {
    principal.hidden = true;
    principal.setAttribute("aria-hidden", "true");
    principal.style.setProperty("display", "none", "important");
  }

  pagina.hidden = false;
  pagina.removeAttribute("aria-hidden");
  pagina.style.setProperty("display", "block", "important");

  document.body.classList.add("informe-detalle-activo");
  document.documentElement.classList.add("informe-detalle-activo");
  document.body.dataset.igpVista = "informe-detalle";

  pagina.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: "auto" });
}

function salirVistaDetalleInformes() {
  const principal = document.getElementById(ID_HOST_PANTALLA_PRINCIPAL);
  const pagina = document.getElementById(ID_PAGINA_DETALLE_INFORME);

  if (pagina) {
    pagina.hidden = true;
    pagina.setAttribute("aria-hidden", "true");
    pagina.style.setProperty("display", "none", "important");
  }

  if (principal) {
    principal.hidden = false;
    principal.removeAttribute("aria-hidden");
    principal.style.removeProperty("display");
  }

  document.body.classList.remove("informe-detalle-activo");
  document.documentElement.classList.remove("informe-detalle-activo");
  delete document.body.dataset.igpVista;
}

async function volverATarjetasInformes() {
  estadoPantalla.modeloInformeSeleccionado = null;
  estadoPantalla.operativoSeleccionado = null;

  // El host viejo se conserva vacío. Los informes jamás se montan aquí.
  const hostViejo = document.querySelector("#contenedorDinamicoHost");
  if (hostViejo) hostViejo.innerHTML = "";

  const paginaDetalle = document.getElementById(ID_PAGINA_DETALLE_INFORME);
  if (paginaDetalle) paginaDetalle.innerHTML = "";

  salirVistaDetalleInformes();
  document.dispatchEvent(new CustomEvent("igp:modelo-informe-limpiado"));

  const panelModelos = document.getElementById("igp-panel-modelos-informes");
  if (panelModelos) panelModelos.hidden = false;

  try {
    await window.IGP?.pantallaPrincipal?.aplicarFlujo?.();
  } catch (error) {
    console.warn("[Informes_GP] No se pudo repintar tarjetas al volver:", error);
  }

  window.scrollTo({ top: 0, behavior: "auto" });
}

function normalizarModeloDesdeTarjeta(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_")
    .replace("DECTO_460_22", "DECRETO_460_22");
}

function registrarListenerRealtime() {
  if (listenerRealtimeRegistrado) return;

  listenerRealtimeRegistrado = true;

  window.addEventListener("informesgp:supabase-cambio", (event) => {
    manejarCambioSupabase(event.detail || {});
  });
}

function manejarCambioSupabase(detalle = {}) {
  const recurso = String(detalle.recurso || detalle.categoria || "").trim().toUpperCase();

  if (estadoPantalla.modo === "INFORMES") {
    return;
  }

  if (recurso === "OPERATIVOS") {
    recargarItemsDebounce("realtime-operativos");
  }
}

function registrarListenerPostEnvio() {
  if (listenerEnvioRegistrado) return;

  listenerEnvioRegistrado = true;

  window.addEventListener("informesgp:envio-whatsapp-ok", async () => {
    if (estadoPantalla.modo === "INFORMES") {
      await volverATarjetasInformes();
      return;
    }

    await recargarItemsPantalla({
      motivo: "post-envio"
    });
  });
}

async function iniciarCoordinadorSeguro() {
  try {
    const modulo = await import("../../../backend/aplicacion/estado/informes-coordinador.js");

    if (typeof modulo.iniciarCoordinadorInformes === "function") {
      modulo.iniciarCoordinadorInformes();
    }

    if (window.InformesGP?.guardiaFecha && typeof modulo.registrarGuardiaFecha === "function") {
      modulo.registrarGuardiaFecha(window.InformesGP.guardiaFecha);
    }
  } catch (error) {
    console.warn("[Informes_GP] Coordinador no disponible:", error);
  }
}

async function registrarModoSeguro(modo) {
  try {
    const modulo = await import("../../../backend/aplicacion/estado/informes-coordinador.js");

    if (typeof modulo.registrarModoActual === "function") {
      modulo.registrarModoActual(modo);
    }
  } catch {}
}

async function registrarOperativoSeguro(operativo) {
  try {
    const modulo = await import("../../../backend/aplicacion/estado/informes-coordinador.js");

    if (typeof modulo.registrarOperativoSeleccionado === "function") {
      modulo.registrarOperativoSeleccionado(operativo);
    }
  } catch {}
}

async function registrarOperativosDisponiblesSeguro({
  modo,
  operativos
}) {
  try {
    const modulo = await import("../../../backend/aplicacion/estado/informes-coordinador.js");

    if (typeof modulo.registrarOperativosDisponibles === "function") {
      modulo.registrarOperativosDisponibles({
        modo,
        operativos
      });
    }
  } catch {}
}

function getContexto() {
  return {
    ...estadoPantalla,
    guardiaFecha: window.InformesGP?.guardiaFecha || "",
    guardia_fecha: window.InformesGP?.guardiaFecha || ""
  };
}

function actualizarTituloContador(modo) {
  const titulo = document.getElementById("tituloContadorOperativos");
  if (!titulo) return;

  if (modo === "INFORMES") {
    titulo.textContent = "MODELOS DE INFORMES";
    return;
  }

  if (modo === "FINALIZA") {
    titulo.textContent = "OPERATIVOS INICIADOS";
    return;
  }

  if (modo === "INICIA") {
    titulo.textContent = "OPERATIVOS";
    return;
  }

  if (modo === "CONTROL_MOVILES") {
    titulo.textContent = "CONTROL DE MÓVILES";
    return;
  }

  titulo.textContent = "OPERATIVOS";
}

function construirEtiqueta(op = {}) {
  const franja = op.franja_horaria || construirFranja(op.hora_inicio, op.hora_fin) || "SIN HORARIO";
  const lugar = op.lugar || op.qth || op.ubicacion || "SIN LUGAR";
  const tipo = String(op.tipo_nombre || op.tipo_operativo || "OPERATIVO").replaceAll("_", " ");

  return `${franja} - ${lugar} - ${tipo}`;
}

function construirFranja(inicio, fin) {
  const i = String(inicio || "").trim();
  const f = String(fin || "").trim();

  if (i && f) return /FINALIZAR/i.test(f) ? `${i} A FINALIZAR` : `${i} A ${f} HS`;
  if (i) return `${i} HS`;

  return "";
}

function normalizarModo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

function escapeHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
