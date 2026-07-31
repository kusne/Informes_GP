import { TABLAS_SUPABASE } from "./supabase-client.js";

const TABLA_OPERATIVOS_PROGRAMADOS = TABLAS_SUPABASE.operativosProgramados;

export async function listarOperativosProgramadosV2({
  guardia_fecha,
  activo = true
} = {}) {
  const cliente = await obtenerClienteSupabase();

  if (!cliente) {
    console.warn("[Informes_GP] Supabase no disponible para listar operativos programados.");
    return [];
  }

  let query = cliente
    .from(TABLA_OPERATIVOS_PROGRAMADOS)
    .select("*");

  if (guardia_fecha) {
    query = query.eq("guardia_fecha", guardia_fecha);
  }

  if (activo !== null && activo !== undefined) {
    query = query.eq("activo", Boolean(activo));
  }

  query = query
    .order("hora_inicio", { ascending: true })
    .order("hora_fin", { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return normalizarProgramados(data);
}

export async function obtenerOperativoProgramadoPorKeyV2({
  guardia_fecha,
  operativo_key
} = {}) {
  const cliente = await obtenerClienteSupabase();

  if (!cliente || !operativo_key) {
    return null;
  }

  let query = cliente
    .from(TABLA_OPERATIVOS_PROGRAMADOS)
    .select("*")
    .eq("operativo_key", operativo_key)
    .limit(1);

  if (guardia_fecha) {
    query = query.eq("guardia_fecha", guardia_fecha);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizarProgramado(data) : null;
}

function normalizarProgramados(data) {
  if (!Array.isArray(data)) return [];

  return data
    .map(normalizarProgramado)
    .filter((op) => op.operativo_key);
}

function normalizarProgramado(op) {
  if (!op) return null;

  const horaInicio = op.hora_inicio || extraerHoraInicioDesdeFranja(op.franja_horaria);
  const horaFin = op.hora_fin || op.hora_finalizacion || extraerHoraFinDesdeFranja(op.franja_horaria);

  return {
    ...op,
    operativo_key: String(op.operativo_key || op.id_operativo || op.id || construirKeyFallback(op)).trim(),
    guardia_fecha: String(op.guardia_fecha || op.fecha_guardia || op.fecha || "").trim(),
    hora_inicio: String(horaInicio || "").trim(),
    hora_fin: String(horaFin || "").trim(),
    lugar: String(op.lugar || op.qth || op.ubicacion || "SIN LUGAR").trim(),
    tipo_operativo: normalizarTipo(op.tipo_operativo || op.tipo || op.tipo_codigo || "GENERICO"),
    tipo_nombre: String(op.tipo_nombre || op.tipo_descripcion || op.tipo_operativo || op.tipo || "OPERATIVO").trim(),
    estado: String(op.estado || "PROGRAMADO").trim().toUpperCase()
  };
}

async function obtenerClienteSupabase() {
  try {
    const modulo = await import("./supabase-client.js");

    if (typeof modulo.supabaseDisponible === "function" && !modulo.supabaseDisponible()) {
      return null;
    }

    return (
      modulo.supabase ||
      modulo.supabaseClient ||
      modulo.client ||
      window.supabase ||
      window.supabaseClient ||
      window.InformesGP?.supabase ||
      null
    );
  } catch (error) {
    console.warn("[Informes_GP] No se pudo resolver cliente Supabase:", error);
    return null;
  }
}

function construirKeyFallback(op) {
  return [
    op?.guardia_fecha || op?.fecha_guardia || op?.fecha || "",
    op?.hora_inicio || op?.inicio || "",
    op?.hora_fin || op?.hora_finalizacion || op?.fin || "",
    op?.lugar || op?.qth || op?.ubicacion || "",
    op?.tipo_operativo || op?.tipo || ""
  ]
    .map((p) => String(p || "").trim().toLowerCase())
    .filter(Boolean)
    .join("-");
}

function extraerHoraInicioDesdeFranja(franja) {
  const texto = String(franja || "");
  const match = texto.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : "";
}

function extraerHoraFinDesdeFranja(franja) {
  const texto = String(franja || "");
  const matches = [...texto.matchAll(/(\d{1,2}:\d{2})/g)];
  return matches.length >= 2 ? matches[1][1] : "";
}

function normalizarTipo(valor) {
  return String(valor || "GENERICO")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}
