import {
  obtenerEstadoInformes,
  suscribirEstadoInformes
} from "../../../api/app-api.js";
import {
  abrirWhatsappConTexto,
  prepararVentanaWhatsapp,
  cerrarVentanaWhatsappPreparada,
  puedeCompartirArchivosDesdeDispositivo,
  compartirInformeConArchivos
} from "./abrir-whatsapp.js";
import { obtenerSalidaInicioDesdeEstado } from "../../../api/app-api.js";
import { obtenerSalidaFinalizadoDesdeEstado } from "../../../api/app-api.js";
import { obtenerSalidaInformesDesdeEstado } from "../../../api/app-api.js";
import { obtenerSalidaControlMovilesDesdeEstado } from "../../../api/app-api.js";
import {
  limpiarFotosPorModoPayload,
  resolverPrefijoFotoPorModoPayload,
  obtenerFotosPorPrefijo
} from "../../../api/app-api.js";
import {
  contarFotosCargadasDesdeEstado
} from "../../../api/app-api.js";
import { modoEnsayoActivo } from "../../../api/app-api.js";

let cancelarSuscripcionPreview = null;
let envioEnCurso = false;
let sincronizacionPendientesEnCurso = false;

const STORAGE_ENVIOS_PENDIENTES = "informesgp:envios-pendientes:v1";
const MODOS_CON_RESPALDO_LOCAL = new Set(["INICIA", "FINALIZA", "INFORMES"]);

registrarSincronizacionPendientes();

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

  boton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    Promise.resolve(
      manejarEnvioWhatsapp({
        boton,
        getContexto
      })
    ).catch((error) => {
      // Última barrera de seguridad: ningún error de preparación/estado puede
      // quedar como promesa rechazada sin controlar en navegadores móviles.
      envioEnCurso = false;
      console.error("[Informes_GP] Error no controlado en el envío:", error);
      cambiarEstadoBoton(boton, false, resolverEtiquetaBoton(boton));
      marcarEstadoEnvio("No se pudo completar el envío.");
      alert(error?.message || "No se pudo enviar el informe por WhatsApp.");
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

  const texto = limpiarBloqueLegacyFotos(String(salida.texto || ""));

  if (!texto) {
    alert("No hay texto generado para enviar por WhatsApp.");
    return;
  }

  const archivosFotos = obtenerArchivosFotosLocales({
    modo,
    payload: salida.payload
  });

  // Con fotos usamos Web Share cuando el dispositivo lo soporta, para entregar
  // los ARCHIVOS REALES. Si el navegador no soporta compartir archivos, no
  // bloqueamos el informe: se abre WhatsApp con el texto y el usuario puede
  // adjuntar las fotos manualmente. Nunca se insertan URLs de fotos en el texto.
  const puedeAdjuntarFotosDirectamente =
    archivosFotos.length > 0 && puedeCompartirArchivosDesdeDispositivo(archivosFotos);

  const fotosRequierenAdjuntoManual =
    archivosFotos.length > 0 && !puedeAdjuntarFotosDirectamente;

  if (puedeAdjuntarFotosDirectamente) {
    envioEnCurso = true;
    cambiarEstadoBoton(boton, true, "Compartiendo fotos...");
    marcarEstadoEnvio("Seleccione WhatsApp para enviar el informe con las fotos...");

    try {
      // IMPORTANTE: esta es la primera operación asíncrona del click.
      // navigator.share() conserva así la activación requerida por el navegador.
      await compartirInformeConArchivos({
        texto,
        archivos: archivosFotos
      });

      cambiarEstadoBoton(
        boton,
        true,
        modoEnsayoActivo() ? "Finalizando ensayo..." : "Guardando..."
      );

      const resultadoSupabase = await guardarSegunModoSiCorresponde({
        modo,
        payload: salida.payload
      });

      if (resultadoSupabase.bloqueaEnvio) {
        alert(
          "El informe y las fotos ya fueron compartidos, pero NO se pudo guardar el estado en Supabase.\n\n" +
          (resultadoSupabase.mensaje || "Error desconocido de Supabase.")
        );
        return;
      }

      limpiarFotosPorModoPayload({
        modo,
        payload: resultadoSupabase.payloadFinal || salida.payload
      });

      marcarEstadoEnvio(
        resultadoSupabase.ensayo
          ? "Informe y fotos compartidos (ensayo)."
          : "Informe y fotos enviados. Guardado en Supabase."
      );

      window.dispatchEvent(new CustomEvent("informesgp:envio-whatsapp-ok", {
        detail: {
          modo,
          supabase: resultadoSupabase,
          textoFinal: texto,
          fotosAdjuntas: archivosFotos.length
        }
      }));
    } catch (error) {
      if (error?.name === "AbortError") {
        marcarEstadoEnvio("Envío cancelado.");
        return;
      }

      console.error("[Informes_GP] Error compartiendo WhatsApp con fotos:", error);
      alert(error?.message || "No se pudo compartir el informe con las fotos.");
    } finally {
      envioEnCurso = false;

      actualizarVistaPreviaSalida({
        host: boton?.closest(".salida-whatsapp-panel") || document,
        getContexto
      });
    }

    return;
  }

  // Flujo por wa.me: se usa cuando no hay fotos o como contingencia cuando el
  // navegador no permite compartir archivos. La ventana se prepara ANTES de
  // cualquier await para evitar bloqueos de popup y la app principal nunca se
  // reemplaza.
  const ventanaWhatsapp = prepararVentanaWhatsapp();

  if (fotosRequierenAdjuntoManual) {
    alert(
      "Este navegador no permite adjuntar las fotos automáticamente.\n\n" +
      "Se abrirá WhatsApp con el informe de texto. Adjunte las fotos manualmente si corresponde.\n\n" +
      "El envío del informe no quedará bloqueado y no se insertarán links de las fotos."
    );
  }

  let whatsappEntregado = false;

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
      // Regla operativa: una falla de Supabase NUNCA debe impedir abrir WhatsApp.
      // Primero intentamos dejar respaldo local para sincronizarlo después; si el
      // navegador tampoco permite ese respaldo, igualmente continuamos porque el
      // usuario puede ingresar manualmente el informe desde WhatsApp a STATS.
      const pendiente = MODOS_CON_RESPALDO_LOCAL.has(modo)
        ? guardarEnvioPendienteLocal({
            modo,
            payload: salida.payload,
            texto
          })
        : { ok: false, clave: "" };

      marcarEstadoEnvio(
        pendiente.ok
          ? "Abriendo WhatsApp. Pendiente de sincronizar con el servidor..."
          : "Abriendo WhatsApp. Sin guardar en servidor; cargar manualmente en STATS si corresponde."
      );

      abrirWhatsappConTexto(texto, {
        ventanaPreparada: ventanaWhatsapp
      });
      whatsappEntregado = true;

      if (pendiente.ok) {
        window.dispatchEvent(new CustomEvent("informesgp:envio-whatsapp-pendiente", {
          detail: {
            modo,
            textoFinal: texto,
            clavePendiente: pendiente.clave,
            motivo: resultadoSupabase.mensaje || "Error de persistencia"
          }
        }));
      } else {
        window.dispatchEvent(new CustomEvent("informesgp:envio-whatsapp-sin-persistencia", {
          detail: {
            modo,
            textoFinal: texto,
            motivo: resultadoSupabase.mensaje || "Error de persistencia"
          }
        }));
      }

      return;
    }

    if (resultadoSupabase.saltado && !resultadoSupabase.ensayo) {
      const pendiente = MODOS_CON_RESPALDO_LOCAL.has(modo)
        ? guardarEnvioPendienteLocal({
            modo,
            payload: salida.payload,
            texto
          })
        : { ok: false, clave: "" };

      marcarEstadoEnvio(
        pendiente.ok
          ? "Abriendo WhatsApp. Pendiente de sincronizar con el servidor..."
          : "Abriendo WhatsApp. Sin guardar en servidor; cargar manualmente en STATS si corresponde."
      );

      abrirWhatsappConTexto(texto, {
        ventanaPreparada: ventanaWhatsapp
      });
      whatsappEntregado = true;

      if (pendiente.ok) {
        window.dispatchEvent(new CustomEvent("informesgp:envio-whatsapp-pendiente", {
          detail: {
            modo,
            textoFinal: texto,
            clavePendiente: pendiente.clave,
            motivo: resultadoSupabase.mensaje || "Supabase no disponible"
          }
        }));
      } else {
        window.dispatchEvent(new CustomEvent("informesgp:envio-whatsapp-sin-persistencia", {
          detail: {
            modo,
            textoFinal: texto,
            motivo: resultadoSupabase.mensaje || "Supabase no disponible"
          }
        }));
      }

      return;
    }

    eliminarEnvioPendienteLocal({ modo, payload: resultadoSupabase.payloadFinal || salida.payload });

    limpiarFotosPorModoPayload({
      modo,
      payload: resultadoSupabase.payloadFinal || salida.payload
    });

    marcarEstadoEnvio(
      resultadoSupabase.ensayo
        ? "Ensayo: abriendo WhatsApp sin guardar..."
        : (resultadoSupabase.saltado ? "Abriendo WhatsApp sin Supabase..." : "Guardado. Abriendo WhatsApp...")
    );

    abrirWhatsappConTexto(texto, {
      ventanaPreparada: ventanaWhatsapp
    });
    whatsappEntregado = true;

    window.dispatchEvent(new CustomEvent("informesgp:envio-whatsapp-ok", {
      detail: {
        modo,
        supabase: resultadoSupabase,
        textoFinal: texto,
        fotosAdjuntas: 0
      }
    }));
  } catch (error) {
    if (!whatsappEntregado) {
      cerrarVentanaWhatsappPreparada(ventanaWhatsapp);
    }

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

function obtenerArchivosFotosLocales({ modo, payload } = {}) {
  const prefijo = resolverPrefijoFotoPorModoPayload({
    modo,
    payload
  });

  if (!prefijo) return [];

  return obtenerFotosPorPrefijo(prefijo)
    .map((foto) => foto?.archivo || foto?.archivoOriginal || null)
    .filter(Boolean);
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

  const texto = limpiarBloqueLegacyFotos(String(salida.texto || ""));
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
        : `${cantidadFotos} foto(s) cargada(s). Al enviar, se adjuntarán como imágenes reales y también se guardarán en Supabase.`;
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
  try {
    // Única frontera de persistencia: frontend entrega modo + payload a la API.
    // La API decide ensayo/producción y qué repositorio corresponde.
    const persistencia = await import("../../../api/persistencia-api.js");
    return await persistencia.persistirEnvio({ modo, payload });
  } catch (error) {
    console.error("[Informes_GP] Error guardando el envío:", error);
    return {
      ok: false,
      bloqueaEnvio: true,
      payloadFinal: payload || null,
      fotos: [],
      mensaje: `No se pudo guardar el envío:\n${error?.message || error}`
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

function registrarSincronizacionPendientes() {
  if (typeof window === "undefined") return;
  if (window.__informesGpPendientesWhatsappRegistrado) return;

  window.__informesGpPendientesWhatsappRegistrado = true;

  const intentar = () => {
    void sincronizarEnviosPendientesLocales();
  };

  window.addEventListener("online", intentar);
  window.addEventListener("focus", intentar);

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") intentar();
    });
  }

  // Sin timers ni polling: un único intento al cargar el módulo.
  queueMicrotask(intentar);
}

async function sincronizarEnviosPendientesLocales() {
  if (sincronizacionPendientesEnCurso) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  const pendientes = leerEnviosPendientesLocales();
  if (!pendientes.length) return;

  sincronizacionPendientesEnCurso = true;

  try {
    const persistencia = await import("../../../api/persistencia-api.js");

    for (const pendiente of pendientes) {
      if (!MODOS_CON_RESPALDO_LOCAL.has(pendiente.modo)) {
        eliminarPendientePorClave(pendiente.clave);
        continue;
      }

      try {
        const resultado = await persistencia.persistirEnvio({
          modo: pendiente.modo,
          payload: pendiente.payload
        });

        if (!resultado || resultado.ok === false || resultado.bloqueaEnvio) {
          continue;
        }

        // "saltado" en producción significa que todavía no hubo persistencia
        // real (por ejemplo, Supabase no configurado). Se conserva el respaldo.
        if (resultado.saltado && !resultado.ensayo) {
          continue;
        }

        eliminarPendientePorClave(pendiente.clave);

        window.dispatchEvent(new CustomEvent("informesgp:envio-pendiente-sincronizado", {
          detail: {
            modo: pendiente.modo,
            clavePendiente: pendiente.clave,
            supabase: resultado
          }
        }));

        marcarEstadoEnvio("Pendiente sincronizado correctamente con el servidor.");
      } catch (error) {
        console.warn("[Informes_GP] Pendiente todavía no sincronizado:", error);
      }
    }
  } catch (error) {
    console.warn("[Informes_GP] No se pudo iniciar la sincronización de pendientes:", error);
  } finally {
    sincronizacionPendientesEnCurso = false;
  }
}

function guardarEnvioPendienteLocal({ modo, payload, texto = "" } = {}) {
  const clave = construirClavePendiente({ modo, payload });
  if (!clave || !payload) return { ok: false, clave: "" };

  try {
    const pendientes = leerEnviosPendientesLocales();
    const mapa = new Map(pendientes.map((item) => [item.clave, item]));

    mapa.set(clave, {
      clave,
      modo: String(modo || "").trim().toUpperCase(),
      payload: clonarSerializable(payload),
      texto: String(texto || ""),
      guardado_at: new Date().toISOString()
    });

    const salida = Array.from(mapa.values())
      .sort((a, b) => String(a.guardado_at || "").localeCompare(String(b.guardado_at || "")))
      .slice(-50);

    localStorage.setItem(STORAGE_ENVIOS_PENDIENTES, JSON.stringify(salida));
    return { ok: true, clave };
  } catch (error) {
    console.error("[Informes_GP] No se pudo guardar el envío pendiente localmente:", error);
    return { ok: false, clave };
  }
}

function eliminarEnvioPendienteLocal({ modo, payload } = {}) {
  const clave = construirClavePendiente({ modo, payload });
  if (!clave) return;
  eliminarPendientePorClave(clave);
}

function eliminarPendientePorClave(clave) {
  if (!clave) return;

  try {
    const pendientes = leerEnviosPendientesLocales();
    const restantes = pendientes.filter((item) => item.clave !== clave);

    if (restantes.length) {
      localStorage.setItem(STORAGE_ENVIOS_PENDIENTES, JSON.stringify(restantes));
    } else {
      localStorage.removeItem(STORAGE_ENVIOS_PENDIENTES);
    }
  } catch (error) {
    console.warn("[Informes_GP] No se pudo limpiar un pendiente local:", error);
  }
}

function leerEnviosPendientesLocales() {
  try {
    const raw = localStorage.getItem(STORAGE_ENVIOS_PENDIENTES);
    if (!raw) return [];

    const valor = JSON.parse(raw);
    return Array.isArray(valor)
      ? valor.filter((item) => item && item.clave && item.modo && item.payload)
      : [];
  } catch {
    return [];
  }
}

function construirClavePendiente({ modo, payload } = {}) {
  const modoNormalizado = String(modo || "").trim().toUpperCase();
  const guardia = String(payload?.guardia_fecha || "").trim();

  if (modoNormalizado === "INICIA" || modoNormalizado === "FINALIZA") {
    const operativo = String(payload?.operativo_key || "").trim();
    return operativo ? `${modoNormalizado}|${guardia}|${operativo}` : "";
  }

  if (modoNormalizado === "INFORMES") {
    const informe = String(payload?.informe_key || "").trim();
    return informe ? `${modoNormalizado}|${guardia}|${informe}` : "";
  }

  return "";
}

function clonarSerializable(valor) {
  return JSON.parse(JSON.stringify(valor));
}

function limpiarBloqueLegacyFotos(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";

  // Compatibilidad defensiva: versiones antiguas agregaban las URLs de Storage
  // bajo este encabezado. Nunca deben formar parte del mensaje de WhatsApp.
  return texto
    .replace(/\n{1,2}FOTOS\s+ADJUNTAS\s*:[\s\S]*$/i, "")
    .trim();
}

function escapeHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
