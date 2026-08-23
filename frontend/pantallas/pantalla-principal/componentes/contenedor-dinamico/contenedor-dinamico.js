import { cargarComponenteHtml } from "../../../../servicios/ui/cargar-componente-html.js";
import { resolverRutaApp } from "../../../../servicios/rutas/rutas-app.js";
import { renderBotonEnviarWhatsapp } from "../../../../servicios/whatsapp/salida-whatsapp.js";

export async function renderContenedorDinamico({
  hostSelector,
  modo,
  operativoSeleccionado,
  modeloInformeSeleccionado,
  getContexto
} = {}) {
  const host = document.querySelector(hostSelector);

  if (!host) return;

  const modoNormalizado = normalizarModo(modo);

  try {
    if (!modoNormalizado) {
      mostrarMensaje(host, {
        titulo: "INFORMES GP",
        texto: "Seleccione una opción en el desplegable Informes."
      });
      return;
    }

    if (modoNormalizado === "INICIA") {
      await renderFormularioIniciaContinuo({
        host,
        operativoSeleccionado,
        getContexto
      });
      return;
    }

    if (modoNormalizado === "FINALIZA") {
      await renderFormularioFinalizaContinuo({
        host,
        operativoSeleccionado,
        getContexto
      });
      return;
    }

    if (modoNormalizado === "INFORMES") {
      await renderInformes({
        host,
        modeloInformeSeleccionado,
        getContexto
      });
      return;
    }

    if (modoNormalizado === "CONTROL_MOVILES") {
      await renderControlMoviles({
        host,
        getContexto
      });
      return;
    }

    mostrarMensaje(host, {
      titulo: "Modo no reconocido",
      texto: `No se encontró pantalla para ${modoNormalizado}.`
    });
  } catch (error) {
    console.error("[Informes_GP] Error en contenedor dinámico:", error);

    mostrarMensaje(host, {
      titulo: "Error en módulo dinámico",
      texto: error?.message || String(error),
      error: true
    });
  }
}


async function renderFormularioIniciaContinuo({
  host,
  operativoSeleccionado,
  getContexto
}) {
  host.innerHTML = `
    <section class="contenedor-inicia-continuo">
      <div id="formularioIniciaContinuoHost"></div>
      <div id="salidaWhatsappHost"></div>
    </section>
  `;

  const formHost = host.querySelector("#formularioIniciaContinuoHost");
  formHost.innerHTML = await cargarComponenteHtml("/frontend/pantallas/inicia/inicia.html");

  const modulo = await import("../../../inicia/inicia.js");

  if (typeof modulo.iniciarFormularioInicia !== "function") {
    throw new Error("inicia.js no exporta iniciarFormularioInicia.");
  }

  await modulo.iniciarFormularioInicia({
    operativoSeleccionado,
    getContexto,
    root: formHost
  });

  renderBotonEnviarWhatsapp({
    hostSelector: "#salidaWhatsappHost",
    getContexto,
    panelClass: "salida-whatsapp-inicia-compacta",
    buttonLabel: "Enviar por WhatsApp"
  });
}

async function renderFormularioFinalizaContinuo({
  host,
  operativoSeleccionado,
  getContexto
}) {
  if (!operativoSeleccionado) {
    mostrarMensaje(host, {
      titulo: "FINALIZA",
      texto: "Seleccione un operativo iniciado para finalizar."
    });
    return;
  }

  host.innerHTML = `
    <section class="contenedor-finaliza-continuo">
      <div id="formularioFinalizaContinuoHost"></div>
      <div id="salidaWhatsappHost"></div>
    </section>
  `;

  const formHost = host.querySelector("#formularioFinalizaContinuoHost");
  formHost.innerHTML = await cargarComponenteHtml("/frontend/pantallas/finaliza/finaliza.html");

  const modulo = await import("../../../finaliza/finaliza.js");
  if (typeof modulo.iniciarFormularioFinaliza !== "function") {
    throw new Error("finaliza.js no exporta iniciarFormularioFinaliza.");
  }

  await modulo.iniciarFormularioFinaliza({
    operativoSeleccionado,
    getContexto,
    root: formHost
  });

  renderBotonEnviarWhatsapp({
    hostSelector: "#salidaWhatsappHost",
    getContexto,
    panelClass: "salida-whatsapp-finaliza-compacta",
    buttonLabel: "Enviar por WhatsApp"
  });
}

async function renderFormularioOperativo({
  host,
  modo,
  operativoSeleccionado,
  getContexto
}) {
  if (!operativoSeleccionado) {
    mostrarMensaje(host, {
      titulo: modo,
      texto: modo === "INICIA"
        ? "Seleccione un operativo pendiente para iniciar."
        : "Seleccione un operativo iniciado para finalizar."
    });
    return;
  }

  const rutas = await obtenerRutasFormularioOperativoSeguro({
    modo,
    operativoSeleccionado
  });

  host.innerHTML = `
    <section class="contenedor-dinamico-card">
      <div id="formularioOperativoHost"></div>
      <div id="salidaWhatsappHost"></div>
    </section>
  `;

  const formHost = host.querySelector("#formularioOperativoHost");
  formHost.innerHTML = await cargarComponenteHtml(rutas.html);

  const modulo = await import(resolverRutaApp(rutas.modulo));
  const iniciar = modulo[rutas.iniciarExport];

  if (typeof iniciar !== "function") {
    throw new Error(`El módulo ${rutas.modulo} no exporta ${rutas.iniciarExport}.`);
  }

  await iniciar({
    operativoSeleccionado,
    getContexto
  });

  renderBotonEnviarWhatsapp({
    hostSelector: "#salidaWhatsappHost",
    getContexto
  });
}

async function renderInformes({
  host,
  modeloInformeSeleccionado,
  getContexto
}) {
  if (!modeloInformeSeleccionado) {
    mostrarMensaje(host, {
      titulo: "INFORMES GP",
      texto: "Seleccione un modelo de informe."
    });
    return;
  }

  host.innerHTML = `
    <section class="informe-pagina-detalle" data-informe-pagina-detalle role="region" aria-label="Informe ${escapeHtml(modeloInformeSeleccionado.nombre || modeloInformeSeleccionado.titulo || modeloInformeSeleccionado.codigo || "")}">
      <button
        id="btnVolverModelosInformes"
        class="informe-volver-modelos"
        type="button"
        aria-label="Volver a modelos de informes"
        title="Volver a modelos de informes"
      ><span class="informe-volver-modelos__icono" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z"></path></svg></span></button>
      <main class="informe-pagina-contenido">
        <div id="informesModuloHost"></div>
        <div id="salidaWhatsappHost"></div>
      </main>
    </section>
  `;

  host.querySelector("#btnVolverModelosInformes")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("informesgp:volver-modelos-informes"));
  });

  const moduloHost = host.querySelector("#informesModuloHost");
  moduloHost.innerHTML = await cargarComponenteHtml("/frontend/pantallas/informes/informes.html");

  const modulo = await import("../../../informes/informes.js");

  const iniciar =
    modulo.iniciarModuloInformes ||
    modulo.iniciarInformes ||
    modulo.iniciarInformesEspeciales;

  if (typeof iniciar !== "function") {
    throw new Error("04_Informes/informes.js no exporta función de inicio.");
  }

  await iniciar({
    hostSelector: "#informesModuloHost",
    modeloInformeSeleccionado,
    modeloInicial: modeloInformeSeleccionado.modelo_key || modeloInformeSeleccionado.codigo,
    getContexto
  });

  renderBotonEnviarWhatsapp({
    hostSelector: "#salidaWhatsappHost",
    getContexto,
    panelClass: "salida-whatsapp-informes-compacta",
    buttonLabel: "Enviar por WhatsApp"
  });
}

async function renderControlMoviles({
  host,
  getContexto
}) {
  host.innerHTML = `
    <section class="contenedor-dinamico-card">
      <div id="controlMovilesModuloHost"></div>
      <div id="salidaWhatsappHost"></div>
    </section>
  `;

  const moduloHost = host.querySelector("#controlMovilesModuloHost");
  moduloHost.innerHTML = await cargarComponenteHtml("/frontend/pantallas/control-moviles/control-moviles.html");

  const modulo = await import("../../../control-moviles/control-moviles.js");

  const iniciar =
    modulo.iniciarControlMoviles ||
    modulo.iniciarModuloControlMoviles ||
    modulo.renderControlMoviles;

  if (typeof iniciar !== "function") {
    throw new Error("05_Control_Moviles/control-moviles.js no exporta función de inicio.");
  }

  await iniciar({
    hostSelector: "#controlMovilesModuloHost",
    getContexto
  });

  renderBotonEnviarWhatsapp({
    hostSelector: "#salidaWhatsappHost",
    getContexto
  });
}

async function obtenerRutasFormularioOperativoSeguro({
  modo,
  operativoSeleccionado
}) {
  try {
    const rutas = await import("../../../../configuracion/tipos-operativo/tipo-operativo-rutas.js");

    if (typeof rutas.obtenerRutasFormularioOperativo === "function") {
      return rutas.obtenerRutasFormularioOperativo({
        modo,
        operativo: operativoSeleccionado,
        tipo_operativo: operativoSeleccionado?.tipo_operativo
      });
    }
  } catch (error) {
    console.warn("[Informes_GP] No se pudo usar resolver de rutas. Se usa fallback.", error);
  }

  const tipo = String(operativoSeleccionado?.tipo_slug || operativoSeleccionado?.tipo_operativo || "generico")
    .toLowerCase()
    .replaceAll("_", "-");

  if (modo === "INICIA") {
    return {
      html: `/frontend/pantallas/inicia/tipos/${tipo}/inicio-${tipo}.html`,
      modulo: "../../../inicia/inicia.js",
      iniciarExport: "iniciarFormularioInicia"
    };
  }

  return {
    html: `/frontend/pantallas/finaliza/tipos/${tipo}/finaliza-${tipo}.html`,
    modulo: "../../../finaliza/finaliza.js",
    iniciarExport: "iniciarFormularioFinaliza"
  };
}

function mostrarMensaje(host, {
  titulo,
  texto,
  error = false
} = {}) {
  host.innerHTML = `
    <section class="pantalla-mensaje ${error ? "error-formulario" : ""}">
      <h2>${escapeHtml(titulo || "Informes GP")}</h2>
      <p>${escapeHtml(texto || "")}</p>
    </section>
  `;
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
