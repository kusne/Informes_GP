/**
 * INICIA/FINALIZA: sustituye únicamente el contenido de las listas de recursos
 * por el padrón verificado de bmzcn-v2-desarrollo. Conserva los hosts, estilos,
 * callbacks de cambio, campos, validaciones y resto de las pantallas existentes.
 * Sin intervalos de sondeo: Realtime, foco y el cambio puntual de guardia 06:00.
 */
import {
  consultarRecursosGuardiaV2,
  observarRecursosGuardiaV2
} from "../../../api/recursos-guardia-api.js";
import { obtenerEstadoInformes } from "../../../api/app-api.js";

const FORMULARIOS = Object.freeze([
  {
    form: ".formulario-inicia",
    personal: [".inicio-personal-lista", "data-inicio-personal", "inicio-personal", "inicio-opcion inicio-opcion-personal"],
    moviles: [".inicio-moviles-grid", "data-inicio-movil", "inicio-movil", "inicio-opcion inicio-opcion-recurso"],
    motos: [".inicio-motos-grid", "data-inicio-moto", "inicio-moto", "inicio-opcion inicio-opcion-recurso"]
  },
  {
    form: ".formulario-finaliza",
    personal: [".finaliza-personal-lista", "data-finaliza-personal", "finaliza-personal", "finaliza-opcion finaliza-opcion-personal"],
    moviles: [".finaliza-moviles-grid", "data-finaliza-movil", "finaliza-movil", "finaliza-opcion finaliza-opcion-recurso"],
    motos: [".finaliza-motos-grid", "data-finaliza-moto", "finaliza-moto", "finaliza-opcion finaliza-opcion-recurso"]
  }
]);

let catalogo = null;
let mensajeError = "";
let revision = 0;
let iniciado = false;
let refrescando = false;
let refrescoPendiente = false;
let cambioGuardiaId = null;
let observarDOM = null;
let cancelarRealtime = null;

export function iniciarSelectoresGuardiaRealtime() {
  if (iniciado) return;
  iniciado = true;

  observarDOM = new MutationObserver(() => sincronizarFormularios());
  observarDOM.observe(document.documentElement, { childList: true, subtree: true });
  sincronizarFormularios();

  try {
    cancelarRealtime = observarRecursosGuardiaV2({
      onCambio: () => { void refrescarCatalogo(); },
      onEstado: (estado) => {
        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(estado)) {
          console.warn("[Informes_GP] Realtime de recursos:", estado);
        }
      }
    });
  } catch (error) {
    console.warn("[Informes_GP] No se pudo iniciar Realtime de recursos:", error);
  }

  window.addEventListener("focus", () => { void refrescarCatalogo(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refrescarCatalogo();
  });
  void refrescarCatalogo();
}

async function refrescarCatalogo() {
  refrescoPendiente = true;
  if (refrescando) return;
  refrescando = true;
  try {
    while (refrescoPendiente) {
      refrescoPendiente = false;
      try {
        const nuevo = await consultarRecursosGuardiaV2();
        catalogo = nuevo;
        mensajeError = "";
      } catch (error) {
        // Nunca recuperar listas fijas ni presentar datos viejos como vigentes.
        catalogo = null;
        mensajeError = "No se pudieron cargar los recursos desde Supabase.";
        console.error("[Informes_GP] Recursos de guardia:", error);
      }
      revision += 1;
      sincronizarFormularios();
    }
  } finally {
    refrescando = false;
    programarSiguienteGuardia();
  }
}

function sincronizarFormularios() {
  if (!catalogo && !mensajeError) return;
  for (const config of FORMULARIOS) {
    document.querySelectorAll(config.form).forEach((form) => {
      for (const clase of ["personal", "moviles", "motos"]) {
        const [selector, atributo, prefijoId, clases] = config[clase];
        const lista = form.querySelector(selector);
        if (!lista || lista.dataset.igpRecursosRevision === String(revision)) continue;
        sincronizarLista({ form, lista, clase, atributo, prefijoId, clases });
      }
      asegurarValidacionAntesDeEnviar(form);
    });
  }
}

function sincronizarLista({ form, lista, clase, atributo, prefijoId, clases }) {
  const anteriores = [...lista.querySelectorAll("input[" + atributo + "]:checked")]
    .map((input) => String(input.value).trim());
  // En el primer render, recuperar recursos del operativo seleccionado.
  if (!lista.dataset.igpRecursosRevision) {
    anteriores.push(...seleccionInicialOperativo(form, clase));
    if (form.matches(".formulario-finaliza")) {
      const bruto = clase === "personal"
        ? form.querySelector('[name="personal"]')?.value
        : form.querySelector('[name="moviles_motos"]')?.value;
      if (bruto) anteriores.push(...extraerSeleccionGuardada(bruto, clase));
    }
  }

  const disponibles = catalogo?.[clase] || [];
  const mapa = new Map(disponibles.map((valor) => [clave(valor), valor]));
  const seleccion = new Set(anteriores.map((valor) => {
    const texto = String(valor).trim();
    if (clase === "personal" && /^SUBJEFE(?:\s|$)/i.test(texto)) return clave("SUBJEFE");
    if (clase === "personal" && /^JEFE(?:\s|$)/i.test(texto)) return clave("JEFE");
    return clave(texto);
  }));

  const fragmento = document.createDocumentFragment();
  for (let indice = 0; indice < disponibles.length; indice++) {
    const valor = disponibles[indice];
    const id = prefijoId + "-" + (indice + 1);
    const label = document.createElement("label");
    label.className = clases;
    label.htmlFor = id;
    const span = document.createElement("span");
    span.textContent = valor;
    const input = document.createElement("input");
    input.id = id;
    input.type = "checkbox";
    input.value = valor;
    input.setAttribute(atributo, "");
    input.checked = seleccion.has(clave(valor));
    label.append(span, input);
    fragmento.appendChild(label);
  }
  if (!disponibles.length) {
    const aviso = document.createElement("span");
    aviso.textContent = mensajeError || (catalogo ? "No hay recursos disponibles." : "Cargando recursos...");
    fragmento.appendChild(aviso);
  }

  lista.replaceChildren(fragmento);
  lista.dataset.igpRecursosRevision = String(revision);
  const removidos = anteriores.some((valor) => !mapa.has(clave(valor)) && !(
    clase === "personal" && /^JEFE(?:\s|$)/i.test(valor) && mapa.has(clave("JEFE"))
  ) && !(
    clase === "personal" && /^SUBJEFE(?:\s|$)/i.test(valor) && mapa.has(clave("SUBJEFE"))
  ));
  if (removidos) lista.dispatchEvent(new Event("change", { bubbles: true }));
}

function seleccionInicialOperativo(form, clase) {
  let operativo = null;
  try { operativo = obtenerEstadoInformes()?.operativoSeleccionado; } catch {}
  if (!operativo || typeof operativo !== "object") return [];
  const keyFormulario = String(form.dataset.operativoSeleccionado || "").trim();
  if (keyFormulario && String(operativo.operativo_key || "").trim() !== keyFormulario) return [];
  const fuentes = [operativo.inicio_payload, operativo, operativo.datos, operativo.metadata]
    .filter((fuente) => fuente && typeof fuente === "object");
  const valores = [];
  for (const fuente of fuentes) {
    if (clase === "personal") {
      valores.push(...listaValores(fuente.personal || fuente.personal_inicio));
    } else {
      valores.push(...listaValores(fuente[clase]));
      valores.push(...extraerSeleccionGuardada(fuente.moviles_motos || "", clase));
    }
  }
  return valores;
}

function listaValores(valor) {
  if (Array.isArray(valor)) return valor.map((v) => String(v || "").trim()).filter(Boolean);
  if (typeof valor === "string") return valor.split(/\r?\n|\s*\/\s*/).map((v) => v.trim()).filter(Boolean);
  return [];
}

function extraerSeleccionGuardada(bruto, clase) {
  const items = String(bruto).split(clase === "personal" ? /\r?\n/ : /\s*\/\s*|\r?\n/)
    .map((valor) => valor.trim()).filter(Boolean);
  if (clase === "personal") return items;
  return items.filter((valor) => /^\d+$/.test(valor));
}

function asegurarValidacionAntesDeEnviar(form) {
  if (form.dataset.igpRecursosVinculados) return;
  form.dataset.igpRecursosVinculados = "1";
  if (form.matches(".formulario-finaliza")) {
    for (const id of ["finalizaMismoPersonal", "finalizaMismoMoviles"]) {
      form.querySelector("#" + id)?.addEventListener("change", () => {
        queueMicrotask(() => sincronizarFormularios());
      });
    }
  }
}

function clave(valor) {
  return String(valor ?? "").trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ");
}

function programarSiguienteGuardia() {
  if (cambioGuardiaId) clearTimeout(cambioGuardiaId);
  // Único disparo a las 06:00 de Santa Fe; NO es polling.
  const ahora = new Date();
  const partes = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(ahora).map(({ type, value }) => [type, value]));
  const horaLocal = Number(partes.hour);
  const fecha = new Date(Date.UTC(+partes.year, +partes.month - 1, +partes.day));
  if (horaLocal >= 6) fecha.setUTCDate(fecha.getUTCDate() + 1);
  const siguiente = Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate(), 9);
  cambioGuardiaId = setTimeout(() => { void refrescarCatalogo(); }, Math.max(250, siguiente - Date.now() + 200));
}
