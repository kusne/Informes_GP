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

export async function reemplazarItemsInformeIntradiarioV2(informe_id, items = []) {
  if (!informe_id) {
    throw new Error("No se pueden reemplazar items intradiarios: falta informe_id.");
  }

  if (!supabaseDisponible()) {
    return crearResultadoSupabaseSaltado("Supabase no configurado. Items intradiarios no persistidos.");
  }

  const supabase = obtenerSupabaseClient();

  const { error: deleteError } = await supabase
    .from(TABLAS_SUPABASE.informesIntradiariosItems)
    .delete()
    .eq("informe_id", informe_id);

  if (deleteError) throw deleteError;

  if (!Array.isArray(items) || !items.length) {
    return crearResultadoSupabaseOk([]);
  }

  return guardarItemsInformeIntradiarioV2(items);
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
    .eq("informe_id", informe_id)
    .order("orden", { ascending: true });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}
