import {
  TABLAS_SUPABASE,
  obtenerSupabaseClient,
  supabaseDisponible,
  crearResultadoSupabaseSaltado,
  crearResultadoSupabaseOk
} from "./supabase-client.js";

export async function guardarItemsInformeIntradiarioV2(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return crearResultadoSupabaseOk([]);
  }

  if (!supabaseDisponible()) {
    return crearResultadoSupabaseSaltado("Supabase no configurado. Items intradiarios no persistidos.");
  }

  const supabase = obtenerSupabaseClient();

  const { data, error } = await supabase
    .from(TABLAS_SUPABASE.informesIntradiariosItems)
    .insert(items)
    .select();

  if (error) {
    throw error;
  }

  return crearResultadoSupabaseOk(data || []);
}

export async function listarItemsInformeIntradiarioV2({ informe_id } = {}) {
  if (!supabaseDisponible()) {
    return [];
  }

  if (!informe_id) {
    return [];
  }

  const supabase = obtenerSupabaseClient();

  const { data, error } = await supabase
    .from(TABLAS_SUPABASE.informesIntradiariosItems)
    .select("*")
    .eq("informe_id", informe_id);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}
