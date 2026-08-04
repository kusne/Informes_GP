import {
  obtenerClienteOperativosProgramados,
  TABLA_OPERATIVOS_PROGRAMADOS_V2
} from "./supabase-operativos-programados-client.js";
import {
  normalizarOperativoProgramadoV2,
  normalizarOperativosProgramadosV2
} from "./operativos-programados-v2-mapper.js";

export async function listarOperativosProgramadosV2({
  guardia_fecha,
  activo = true,
  excluir_sin_efecto = true
} = {}) {
  const cliente = obtenerClienteOperativosProgramados();

  if (!cliente) {
    throw new Error("El cliente del nuevo Supabase de operativos no está disponible.");
  }

  let query = cliente
    .from(TABLA_OPERATIVOS_PROGRAMADOS_V2)
    .select(
      "id,orden_publicada_id,operativo_key,lote_guardia_id,publicacion_lote_id,guardia_fecha,fecha_operativo,inicio_operativo,hora_desde,hora_hasta,lugar,lugar_normalizado,tipo,ordenes_origen,archivos_origen,activo,sin_efecto,sin_efecto_motivo,sin_efecto_updated_at,error_en_la_orden,error_motivo,registro_original,created_at,updated_at"
    );

  if (guardia_fecha) {
    query = query.eq("guardia_fecha", guardia_fecha);
  }

  if (activo !== null && activo !== undefined) {
    query = query.eq("activo", Boolean(activo));
  }

  if (excluir_sin_efecto) {
    query = query.eq("sin_efecto", false);
  }

  const { data, error } = await query.order("inicio_operativo", { ascending: true });

  if (error) {
    const mensaje = error?.message || String(error);
    throw new Error(`No se pudieron leer ${TABLA_OPERATIVOS_PROGRAMADOS_V2}: ${mensaje}`);
  }

  return deduplicarPorKey(normalizarOperativosProgramadosV2(data));
}

export async function obtenerOperativoProgramadoPorKeyV2({
  guardia_fecha,
  operativo_key
} = {}) {
  const cliente = obtenerClienteOperativosProgramados();

  if (!cliente || !operativo_key) {
    return null;
  }

  let query = cliente
    .from(TABLA_OPERATIVOS_PROGRAMADOS_V2)
    .select("*")
    .eq("operativo_key", operativo_key)
    .eq("activo", true)
    .eq("sin_efecto", false)
    .limit(1);

  if (guardia_fecha) {
    query = query.eq("guardia_fecha", guardia_fecha);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    const mensaje = error?.message || String(error);
    throw new Error(`No se pudo leer el operativo ${operativo_key}: ${mensaje}`);
  }

  return data ? normalizarOperativoProgramadoV2(data) : null;
}

function deduplicarPorKey(items = []) {
  const mapa = new Map();

  for (const item of items) {
    const key = String(item?.operativo_key || "").trim();
    if (!key) continue;

    const anterior = mapa.get(key);
    if (!anterior || timestamp(item.updated_at) >= timestamp(anterior.updated_at)) {
      mapa.set(key, item);
    }
  }

  return Array.from(mapa.values()).sort((a, b) => {
    const porInicio = timestamp(a.inicio_operativo) - timestamp(b.inicio_operativo);
    if (porInicio !== 0) return porInicio;
    return String(a.operativo_key).localeCompare(String(b.operativo_key));
  });
}

function timestamp(valor) {
  const n = Date.parse(valor || "");
  return Number.isFinite(n) ? n : 0;
}
