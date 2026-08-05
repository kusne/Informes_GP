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
  const informeKey = String(payload.informe_key || "").trim();

  if (informeKey) {
    const existente = await buscarInformePorKey(informeKey);

    if (existente?.id) {
      const { data, error } = await supabase
        .from(TABLAS_SUPABASE.informesIntradiarios)
        .update(payload)
        .eq("id", existente.id)
        .select()
        .single();

      if (error) throw error;

      return crearResultadoSupabaseOk(data);
    }
  }

  const { data, error } = await supabase
    .from(TABLAS_SUPABASE.informesIntradiarios)
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return crearResultadoSupabaseOk(data);
}

export async function buscarInformePorKey(informe_key) {
  if (!supabaseDisponible() || !informe_key) return null;

  const supabase = obtenerSupabaseClient();
  const { data, error } = await supabase
    .from(TABLAS_SUPABASE.informesIntradiarios)
    .select("*")
    .eq("informe_key", informe_key)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function listarInformesIntradiariosV2({
  guardia_fecha,
  operativo_key,
  tipo_informe,
  activo = true,
  limite = 100
} = {}) {
  if (!supabaseDisponible()) {
    return [];
  }

  const supabase = obtenerSupabaseClient();

  let query = supabase
    .from(TABLAS_SUPABASE.informesIntradiarios)
    .select("*")
    .order("fecha_evento", { ascending: false })
    .limit(Math.max(1, Number(limite || 100)));

  if (guardia_fecha) query = query.eq("guardia_fecha", guardia_fecha);
  if (operativo_key) query = query.eq("operativo_key", operativo_key);
  if (tipo_informe) query = query.eq("tipo_informe", tipo_informe);
  if (activo !== null && activo !== undefined) query = query.eq("activo", Boolean(activo));

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}
