import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL_FIJA = "https://hbnxvwrqxhurdteirsyl.supabase.co";
const SUPABASE_ANON_KEY_FIJA = "sb_publishable_GgrICSZSYl6Fc5D8SzT-aA_GLCB9J01";

export const TABLAS_SUPABASE_ACTUALES = Object.freeze({
  operativosPublicados: "operativos_publicados",
  operativosEstado: "operativos_estado",
  operativosEventos: "operativos_eventos"
});

export const TABLAS_SUPABASE = Object.freeze({
  operativosProgramados: "bmzcn_operativos_programados_v2",
  operativosEstado: "bmzcn_operativos_estado_v2",
  informesIntradiarios: "bmzcn_informes_intradiarios_v2",
  informesIntradiariosItems: "bmzcn_informes_intradiarios_items_v2",
  controlMoviles: "control_moviles_novedades"
});

export const TABLAS_REALTIME_INFORMES_GP = Object.freeze([
  TABLAS_SUPABASE.operativosProgramados,
  TABLAS_SUPABASE.operativosEstado,
  TABLAS_SUPABASE.informesIntradiarios,
  TABLAS_SUPABASE.informesIntradiariosItems
]);

let configSupabase = { url: SUPABASE_URL_FIJA, anonKey: SUPABASE_ANON_KEY_FIJA };
export let supabase = crearClienteSupabaseSeguro(configSupabase);
export let supabaseClient = supabase;
export let client = supabase;

export function configurarSupabase({ url, anonKey } = {}) {
  const siguiente = {
    url: limpiar(url) || configSupabase.url || SUPABASE_URL_FIJA,
    anonKey: limpiar(anonKey) || configSupabase.anonKey || SUPABASE_ANON_KEY_FIJA
  };

  if (siguiente.url === configSupabase.url && siguiente.anonKey === configSupabase.anonKey && supabase) {
    return obtenerConfigSupabase();
  }

  configSupabase = siguiente;
  supabase = crearClienteSupabaseSeguro(configSupabase);
  supabaseClient = supabase;
  client = supabase;
  return obtenerConfigSupabase();
}

export function obtenerSupabaseClient() { return supabase; }
export function obtenerConfigSupabase() { return { ...configSupabase, configurado: supabaseDisponible() }; }
export function supabaseDisponible() { return Boolean(supabase); }

function crearClienteSupabaseSeguro({ url, anonKey }) {
  if (!url || !anonKey) {
    console.warn("[Informes_GP] Supabase no configurado.");
    return null;
  }
  if (!/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/.test(url)) {
    console.warn("[Informes_GP] URL de Supabase inválida:", url);
    return null;
  }
  try {
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 10 } }
    });
  } catch (error) {
    console.error("[Informes_GP] No se pudo crear cliente Supabase:", error);
    return null;
  }
}

function limpiar(valor) { return String(valor || "").trim(); }

export function crearResultadoSupabaseSaltado(mensaje = "Supabase no configurado.") {
  return { ok: false, saltado: true, mensaje, data: null };
}
export function crearResultadoSupabaseOk(data = null) {
  return { ok: true, saltado: false, data };
}
