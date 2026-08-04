import {
  obtenerEstadoInformes,
  suscribirEstadoInformes
} from "../../../backend/aplicacion/estado/informes-state.js";
import { abrirWhatsappConTexto } from "./abrir-whatsapp.js";
import { obtenerSalidaInicioDesdeEstado } from "../../../backend/dominio/whatsapp/formateador-inicio.js";
import { obtenerSalidaFinalizadoDesdeEstado } from "../../../backend/dominio/whatsapp/formateador-finalizado.js";
import { obtenerSalidaInformesDesdeEstado } from "../../../backend/dominio/whatsapp/formateador-informes.js";
import { obtenerSalidaControlMovilesDesdeEstado } from "../../../backend/dominio/whatsapp/formateador-control-moviles.js";
import { subirFotosAdjuntasSupabase } from "../../../backend/infraestructura/supabase/subir-foto-supabase.js";
import { limpiarFotosPorModoPayload } from "../../../backend/aplicacion/estado/fotos-estado.js";
import {
  agregarFotosAlTextoWhatsapp,
  contarFotosCargadasDesdeEstado
} from "../../../backend/dominio/whatsapp/fotos-whatsapp.js";
import { modoEnsayoActivo } from "../../../backend/infraestructura/ensayo/modo-ensayo.js";
import { registrarTransicionOperativoEnsayo } from "../../../backend/infraestructura/ensayo/operativos-ensayo.js";

let cancelarSuscripcionPreview = null;
let envioEnCurso = false;

export function renderBotonEnviarWhatsapp({
  hostSelector,
  getContexto,
  panelClass = "",
  buttonLabel = ""
} = {}) {
  const host = document.querySelector(hostSelector);

  if (!host) return;

  if (typeof cancelarSuscripcionPreview === "function") {
    cancelarSuscripcionPreview();
    cancelarSuscripcionPreview = null;
  }

  const ensayo = modoEnsayoActivo();
  const etiquetaBoton = String(buttonLabel || (ensayo ? "Probar WhatsApp" : "Enviar WhatsApp")).trim();
  const clasePanel = String(panelClass || "").trim();

  host.innerHTML = `
    <section class="salida-whatsapp-panel ${escapeHtml(clasePanel)}">
      ${ensayo ? `<div class="salida-whatsapp-ensayo">ENSAYO: genera el texto y abre WhatsApp, pero no guarda ni sube fotos a Supabase.</div>` : ""}
      <div class="salida-whatsapp-preview-header">
        <h3>Vista previa WhatsApp</h3>
        <span id="salidaWhatsappEstado" class="salida-whatsapp-estado">Sin datos</span>
      </div>

      <div id="salidaWhatsappFotosInfo" class="salida-whatsapp-fotos-info hidden"></div>

      <div id="salidaWhatsappErrores" class="salida-whatsapp-errores hidden"></div>

      <pre id="salidaWhatsappPreview" class="salida-whatsapp-preview">Complete el formulario para generar el texto.</pre>

      <button
        type="button"
        id="botonEnviarWhatsapp"
        class="boton-enviar-whatsapp"
        data-etiqueta-base="${escapeHtml(etiquetaBoton)}"
        disabled
      >
        ${escapeHtml(etiquetaBoton)}
      </button>
    </section>
  `;

  const boton = host.querySelector("#botonEnviarWhatsapp");

  if (!boton) return;

  boton.addEventListener("click", async () => {
    await manejarEnvioWhatsapp({
      boton,
      getContexto
    });
  });

  const actualizar = () => {
    actualizarVistaPreviaSalida({
      host,
      getContexto
    });
  };

  actualizar();

  cancelarSuscripcionPreview = suscribirEstadoInformes(() => {
    actualizar();
  });
}

export async function manejarEnvioWhatsapp({ boton = null, getContexto } = {}) {
  if (envioEnCurso) {
    console.warn("[Informes_GP] Envío ignorado porque ya hay un envío en curso.");
    return;
  }

  const estado = obtenerEstadoInformes();
  const contexto = typeof getContexto === "function" ? getContexto() : {};
  const modo = resolverModoActual(estado, contexto);

  const salida = resolverSalidaPorModo({
    modo,
    estado
  });

  if (!salida) {
    alert("Debe seleccionar un modo válido antes de enviar.");
    return;
  }

  if (Array.isArray(salida.errores) && salida.errores.length) {
    alert(`No se puede enviar todavía:\n\n${salida.errores.join("\n")}`);
    return;
  }

  const texto = String(salida.texto || "").trim();

  if (!texto) {
    alert("No hay texto generado para enviar por WhatsApp.");
    return;
  }

  envioEnCurso = true;
  cambiarEstadoBoton(
    boton,
    true,
    modoEnsayoActivo() ? "Preparando ensayo..." : "Guardando..."
  );

  try {
    const resultadoSupabase = await guardarSegunModoSiCorresponde({
      modo,
      payload: salida.payload
    });

    if (resultadoSupabase.bloqueaEnvio) {
      alert(resultadoSupabase.mensaje || "No se pudo guardar en Supabase.");
      return;
    }

    const textoFinal = agregarFotosAlTextoWhatsapp({
      texto,
      fotos: resultadoSupabase.fotos || []
    });

    limpiarFotosPorModoPayload({
      modo,
      payload: resultadoSupabase.payloadFinal || salida.payload
    });

    marcarEstadoEnvio(
      resultadoSupabase.ensayo
        ? "Ensayo: abriendo WhatsApp sin guardar..."
        : (resultadoSupabase.saltado ? "Abriendo WhatsApp sin Supabase..." : "Guardado. Abriendo WhatsApp...")
    );
    abrirWhatsappConTexto(textoFinal);

    window.dispatchEvent(new CustomEvent("informesgp:envio-whatsapp-ok", {
      detail: {
        modo,
        supabase: resultadoSupabase,
        textoFinal
      }
    }));
  } catch (error) {
    console.error("[Informes_GP] Error al enviar WhatsApp:", error);
    alert(error?.message || "No se pudo enviar por WhatsApp.");
  } finally {
    envioEnCurso = false;

    actualizarVistaPreviaSalida({
      host: boton?.closest(".salida-whatsapp-panel") || document,
      getContexto
    });
  }
}

function actualizarVistaPreviaSalida({ host, getContexto } = {}) {
  const estado = obtenerEstadoInformes();
  const contexto = typeof getContexto === "function" ? getContexto() : {};
  const modo = resolverModoActual(estado, contexto);

  const salida = resolverSalidaPorModo({
    modo,
    estado
  });

  const preview = host.querySelector?.("#salidaWhatsappPreview") || document.getElementById("salidaWhatsappPreview");
  const erroresBox = host.querySelector?.("#salidaWhatsappErrores") || document.getElementById("salidaWhatsappErrores");
  const estadoBox = host.querySelector?.("#salidaWhatsappEstado") || document.getElementById("salidaWhatsappEstado");
  const boton = host.querySelector?.("#botonEnviarWhatsapp") || document.getElementById("botonEnviarWhatsapp");
  const fotosInfo = host.querySelector?.("#salidaWhatsappFotosInfo") || document.getElementById("salidaWhatsappFotosInfo");

  if (!preview || !erroresBox || !estadoBox || !boton) return;

  if (envioEnCurso) {
    boton.disabled = true;
    return;
  }

  if (!salida) {
    preview.textContent = "Seleccione un modo para generar el texto.";
    erroresBox.classList.add("hidden");
    erroresBox.innerHTML = "";
    if (fotosInfo) {
      fotosInfo.classList.add("hidden");
      fotosInfo.innerHTML = "";
    }
    estadoBox.textContent = "Sin modo";
    estadoBox.className = "salida-whatsapp-estado salida-whatsapp-estado-error";
    boton.disabled = true;
    boton.textContent = resolverEtiquetaBoton(boton);
    return;
  }

  const texto = String(salida.texto || "").trim();
  const errores = Array.isArray(salida.errores) ? salida.errores.filter(Boolean) : [];

  preview.textContent = texto || "Complete el formulario para generar el texto.";

  if (fotosInfo) {
    const cantidadFotos = contarFotosCargadasDesdeEstado({
      modo,
      estado,
      payload: salida.payload
    });

    if (cantidadFotos > 0) {
      fotosInfo.classList.remove("hidden");
      fotosInfo.textContent = modoEnsayoActivo()
        ? `${cantidadFotos} foto(s) cargada(s). En ensayo no se subirán a Supabase.`
        : `${cantidadFotos} foto(s) cargada(s). Al enviar, se subirán a Supabase y se agregará el link al WhatsApp.`;
    } else {
      fotosInfo.classList.add("hidden");
      fotosInfo.innerHTML = "";
    }
  }

  if (errores.length) {
    erroresBox.classList.remove("hidden");
    erroresBox.innerHTML = `
      <strong>Falta corregir:</strong>
      <ul>
        ${errores.map((err) => `<li>${escapeHtml(err)}</li>`).join("")}
      </ul>
    `;
  } else {
    erroresBox.classList.add("hidden");
    erroresBox.innerHTML = "";
  }

  const habilitado = Boolean(texto) && errores.length === 0;
  const panelCompacto = boton.closest?.(".salida-whatsapp-inicia-compacta, .salida-whatsapp-finaliza-compacta");

  boton.textContent = resolverEtiquetaBoton(boton);
  // INICIA y FINALIZA mantienen el botón visible y activo.
  // La validación se ejecuta al pulsarlo y nunca resetea el formulario.
  boton.disabled = panelCompacto ? false : !habilitado;

  if (habilitado) {
    estadoBox.textContent = modoEnsayoActivo() ? "Listo para probar" : "Listo para enviar";
    estadoBox.className = "salida-whatsapp-estado salida-whatsapp-estado-ok";
  } else if (errores.length) {
    estadoBox.textContent = "Incompleto";
    estadoBox.className = "salida-whatsapp-estado salida-whatsapp-estado-error";
  } else {
    estadoBox.textContent = "Sin texto";
    estadoBox.className = "salida-whatsapp-estado salida-whatsapp-estado-pendiente";
  }
}

function resolverEtiquetaBoton(boton) {
  const personalizada = String(boton?.dataset?.etiquetaBase || "").trim();
  if (personalizada) return personalizada;
  return modoEnsayoActivo() ? "Probar WhatsApp" : "Enviar WhatsApp";
}

function resolverModoActual(estado, contexto) {
  return String(estado?.modo || contexto?.modo || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

function resolverSalidaPorModo({ modo, estado }) {
  if (modo === "INICIA") {
    return obtenerSalidaInicioDesdeEstado(estado);
  }

  if (modo === "FINALIZA") {
    return obtenerSalidaFinalizadoDesdeEstado(estado);
  }

  if (modo === "INFORMES") {
    return obtenerSalidaInformesDesdeEstado(estado);
  }

  if (modo === "CONTROL_MOVILES") {
    return obtenerSalidaControlMovilesDesdeEstado(estado);
  }

  return null;
}

async function guardarSegunModoSiCorresponde({ modo, payload }) {
  if (modoEnsayoActivo()) {
    const transicion = registrarTransicionOperativoEnsayo({
      modo,
      payload
    });

    if (transicion?.ok === false) {
      console.warn("[Informes_GP] No se pudo actualizar el estado local del ensayo:", transicion?.mensaje || transicion);
    }

    return {
      ok: true,
      saltado: true,
      ensayo: true,
      transicionEnsayo: transicion || null,
      mensaje: transicion?.ok === false
        ? "Modo ensayo: se generó el informe, pero no pudo actualizarse el estado local del operativo."
        : "Modo ensayo: estado local actualizado; no se guardó información en Supabase.",
      payloadFinal: payload || null,
      fotos: []
    };
  }

  if (!payload) {
    return {
      ok: true,
      saltado: true,
      mensaje: "Sin payload Supabase.",
      payloadFinal: null
    };
  }

  const supabase = await obtenerSupabaseDisponibleSeguro();

  if (!supabase.disponible) {
    console.warn("[Informes_GP] Supabase no configurado. Se abre WhatsApp sin guardar.", supabase.error || "");
    return {
      ok: true,
      saltado: true,
      mensaje: "Supabase no configurado.",
      payloadFinal: payload,
      fotos: []
    };
  }

  try {
    const resultadoFotos = await subirFotosAdjuntasSupabase({
      modo,
      payload
    });

    const payloadFinal = resultadoFotos?.payload || payload;

    if (modo === "INICIA") {
      const repo = await import("../../../backend/infraestructura/supabase/operativos-estado-v2-repo.js");
      const data = await repo.guardarInicioOperativoV2(payloadFinal);

      return {
        ok: true,
        data,
        payloadFinal,
        fotos: resultadoFotos?.fotos || [],
        mensaje: "Inicio guardado."
      };
    }

    if (modo === "FINALIZA") {
      const repo = await import("../../../backend/infraestructura/supabase/operativos-estado-v2-repo.js");
      const data = await repo.guardarFinalizadoOperativoV2(payloadFinal);

      return {
        ok: true,
        data,
        payloadFinal,
        fotos: resultadoFotos?.fotos || [],
        mensaje: "Finalizado guardado."
      };
    }

    if (modo === "INFORMES") {
      const repo = await import("../../../backend/infraestructura/supabase/informes-especiales-v2-repo.js");
      const data = await repo.guardarInformeEspecialV2(payloadFinal);

      return {
        ok: true,
        saltado: Boolean(data?.saltado),
        data,
        payloadFinal,
        fotos: resultadoFotos?.fotos || [],
        mensaje: data?.mensaje || "Informe sin persistencia Supabase."
      };
    }

    if (modo === "CONTROL_MOVILES") {
      const repo = await import("../../../backend/infraestructura/supabase/control-moviles-repo.js");
      const data = await repo.guardarNovedadMovil(payload);

      return {
        ok: true,
        data,
        payloadFinal: payload,
        fotos: [],
        mensaje: "Novedad de móvil guardada."
      };
    }

    return {
      ok: true,
      saltado: true,
      payloadFinal: payload,
      fotos: [],
      mensaje: "Modo sin persistencia Supabase."
    };
  } catch (error) {
    console.error("[Informes_GP] Error guardando en Supabase:", error);

    return {
      ok: false,
      bloqueaEnvio: true,
      payloadFinal: payload,
      fotos: [],
      mensaje: `No se pudo guardar en Supabase:\n${error?.message || error}`
    };
  }
}

async function obtenerSupabaseDisponibleSeguro() {
  try {
    const modulo = await import("../../../backend/infraestructura/supabase/supabase-client.js");

    if (typeof modulo.supabaseDisponible !== "function") {
      return {
        disponible: Boolean(modulo.supabase || modulo.supabaseClient || window.supabase || window.supabaseClient),
        error: ""
      };
    }

    return {
      disponible: Boolean(modulo.supabaseDisponible()),
      error: ""
    };
  } catch (error) {
    return {
      disponible: false,
      error
    };
  }
}

function cambiarEstadoBoton(boton, bloqueado, texto) {
  if (!boton) return;

  boton.disabled = Boolean(bloqueado);
  boton.textContent = texto || "Enviar WhatsApp";
}

function marcarEstadoEnvio(texto) {
  const estadoBox = document.getElementById("salidaWhatsappEstado");
  if (!estadoBox) return;

  estadoBox.textContent = texto;
  estadoBox.className = "salida-whatsapp-estado salida-whatsapp-estado-ok";
}

function escapeHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
