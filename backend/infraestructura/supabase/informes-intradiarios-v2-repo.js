import {
  TABLAS_SUPABASE,
  obtenerSupabaseClient,
  supabaseDisponible,
  crearResultadoSupabaseSaltado,
  crearResultadoSupabaseOk
} from "./supabase-client.js";

export async function guardarInformeIntradiarioV2(payload) {
  if (!payload) {
    throw new Error("No hay payload de informe intradiario para guardar.");
  }

  if (!supabaseDisponible()) {
    return crearResultadoSupabaseSaltado("Supabase no configurado. Informe intradiario no persistido.");
  }

  const supabase = obtenerSupabaseClient();

  const { data, error } = await supabase
    .from(TABLAS_SUPABASE.informesIntradiarios)
    .insert(payload)
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  return crearResultadoSupabaseOk(data);
}

export async function listarInformesIntradiariosV2({ guardia_fecha } = {}) {
  if (!supabaseDisponible()) {
    return [];
  }

  const supabase = obtenerSupabaseClient();

  let query = supabase
    .from(TABLAS_SUPABASE.informesIntradiarios)
    .select("*")
    .order("created_at", { ascending: false });

  if (guardia_fecha) {
    query = query.eq("guardia_fecha", guardia_fecha);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}
