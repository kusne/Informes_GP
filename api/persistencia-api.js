/**
 * Adaptador de infraestructura para el navegador.
 * Es el único punto público usado por frontend/ para persistencia y Realtime.
 */
import {
  configurarSupabase,
  obtenerConfigSupabase,
  supabaseDisponible
} from "../backend/infraestructura/supabase/supabase-client.js";
import {
  iniciarRealtimeInformesGP as iniciarRealtimeBackend,
  detenerRealtimeInformesGP as detenerRealtimeBackend,
  estaRealtimeInformesGPActivo
} from "../backend/infraestructura/supabase/supabase-realtime.js";
import { modoEnsayoActivo } from "../backend/infraestructura/ensayo/modo-ensayo.js";
import { registrarTransicionOperativoEnsayo } from "../backend/infraestructura/ensayo/operativos-ensayo.js";

let entornoSupabaseInicializado = false;

export function inicializarPersistenciaNavegador() {
  if (entornoSupabaseInicializado) return obtenerConfigSupabase();
  entornoSupabaseInicializado = true;

  const config = leerConfigSupabaseNavegador();
  if (config.url || config.anonKey) {
    configurarSupabase(config);
  }

  return obtenerConfigSupabase();
}

export function estaSupabaseDisponible() {
  inicializarPersistenciaNavegador();
  return Boolean(supabaseDisponible());
}

export async function persistirEnvio({ modo, payload } = {}) {
  if (modoEnsayoActivo()) {
    const transicion = registrarTransicionOperativoEnsayo({ modo, payload });
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

  inicializarPersistenciaNavegador();

  if (!payload) {
    return {
      ok: true,
      saltado: true,
      mensaje: "Sin payload Supabase.",
      payloadFinal: null,
      fotos: []
    };
  }

  if (!supabaseDisponible()) {
    return {
      ok: true,
      saltado: true,
      mensaje: "Supabase no configurado.",
      payloadFinal: payload,
      fotos: []
    };
  }

  const modoNormalizado = normalizarModo(modo);
  const fotosRepo = await import("../backend/infraestructura/supabase/subir-foto-supabase.js");
  const resultadoFotos = await fotosRepo.subirFotosAdjuntasSupabase({ modo: modoNormalizado, payload });
  const payloadFinal = resultadoFotos?.payload || payload;

  if (modoNormalizado === "INICIA") {
    const repo = await import("../backend/infraestructura/supabase/operativos-estado-v2-repo.js");
    const data = await repo.guardarInicioOperativoV2(payloadFinal);
    return { ok: true, data, payloadFinal, fotos: resultadoFotos?.fotos || [], mensaje: "Inicio guardado." };
  }

  if (modoNormalizado === "FINALIZA") {
    const repo = await import("../backend/infraestructura/supabase/operativos-estado-v2-repo.js");
    const data = await repo.guardarFinalizadoOperativoV2(payloadFinal);
    return { ok: true, data, payloadFinal, fotos: resultadoFotos?.fotos || [], mensaje: "Finalizado guardado." };
  }

  if (modoNormalizado === "INFORMES") {
    const repo = await import("../backend/infraestructura/supabase/informes-especiales-v2-repo.js");
    const data = await repo.guardarInformeEspecialV2(payloadFinal);
    return {
      ok: true,
      saltado: Boolean(data?.saltado),
      data,
      payloadFinal,
      fotos: resultadoFotos?.fotos || [],
      mensaje: data?.mensaje || "Informe guardado en Supabase V2."
    };
  }

  if (modoNormalizado === "CONTROL_MOVILES") {
    const repo = await import("../backend/infraestructura/supabase/control-moviles-repo.js");
    const data = await repo.guardarNovedadMovil(payload);
    return { ok: true, data, payloadFinal: payload, fotos: [], mensaje: "Novedad de móvil guardada." };
  }

  return {
    ok: true,
    saltado: true,
    payloadFinal: payload,
    fotos: [],
    mensaje: "Modo sin persistencia Supabase."
  };
}

export function iniciarRealtimeInformesGP({ guardia_fecha, onCambio } = {}) {
  inicializarPersistenciaNavegador();
  return iniciarRealtimeBackend({
    guardia_fecha,
    onCambio: (detalle) => {
      emitirEvento("informesgp:supabase-cambio", detalle);
      if (typeof onCambio === "function") onCambio(detalle);
    },
    onEstado: (detalle) => emitirEvento("informesgp:realtime-estado", detalle)
  });
}

export async function detenerRealtimeInformesGP() {
  return detenerRealtimeBackend();
}

export { estaRealtimeInformesGPActivo };

function leerConfigSupabaseNavegador() {
  const globalConfig = globalThis?.SUPABASE_CONFIG || globalThis?.InformesGP?.supabaseConfig || {};
  const metaUrl = leerMeta("supabase-url");
  const metaAnon = leerMeta("supabase-anon-key");

  return {
    url: limpiar(globalConfig.url || globalConfig.supabaseUrl || globalThis?.SUPABASE_URL || metaUrl),
    anonKey: limpiar(globalConfig.anonKey || globalConfig.supabaseAnonKey || globalThis?.SUPABASE_ANON_KEY || metaAnon)
  };
}

function leerMeta(nombre) {
  try {
    return globalThis?.document?.querySelector(`meta[name="${nombre}"]`)?.content || "";
  } catch {
    return "";
  }
}

function emitirEvento(nombre, detail) {
  try {
    globalThis?.dispatchEvent?.(new CustomEvent(nombre, { detail }));
  } catch {}
}

function limpiar(valor) {
  return String(valor || "").trim();
}

function normalizarModo(valor) {
  return String(valor || "").trim().toUpperCase().replaceAll("-", "_").replace(/\s+/g, "_");
}
