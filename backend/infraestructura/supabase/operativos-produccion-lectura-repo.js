import { TABLAS_SUPABASE_ACTUALES } from "./supabase-client.js";

const TABLA_PUBLICADOS = TABLAS_SUPABASE_ACTUALES.operativosPublicados;
const TABLA_ESTADO = TABLAS_SUPABASE_ACTUALES.operativosEstado;
const TABLA_EVENTOS = TABLAS_SUPABASE_ACTUALES.operativosEventos;

/**
 * Lectura de compatibilidad con el circuito WSP actualmente operativo.
 * Esta capa solo traduce el esquema vigente de Supabase al contrato interno
 * de Informes_GP. La interfaz no conoce nombres de tablas ni columnas.
 */
export async function listarOperativosPublicadosActuales({ guardia_fecha } = {}) {
  const cliente = await obtenerClienteSupabase();
  if (!cliente) throw new Error("Supabase no está disponible para leer operativos publicados.");

  let query = cliente
    .from(TABLA_PUBLICADOS)
    .select(
      "id,operativo_key,guardia_fecha,fecha_operativo,inicio_operativo,hora_desde,hora_hasta,lugar,lugar_normalizado,tipo,ordenes_origen,archivos_origen,activo,sin_efecto,error_en_la_orden,error_motivo,registro_original,updated_at"
    )
    .eq("activo", true)
    .eq("sin_efecto", false);

  if (guardia_fecha) query = query.eq("guardia_fecha", guardia_fecha);

  const { data, error } = await query.order("inicio_operativo", { ascending: true });
  if (error) throw enriquecerError(error, TABLA_PUBLICADOS);

  return deduplicarPorKey((Array.isArray(data) ? data : [])
    .map(normalizarPublicadoActual)
    .filter(Boolean));
}

export async function listarEstadosOperativosActuales({ guardia_fecha } = {}) {
  const cliente = await obtenerClienteSupabase();
  if (!cliente) throw new Error("Supabase no está disponible para leer el estado de operativos.");

  let query = cliente
    .from(TABLA_ESTADO)
    .select("*")
    .is("deleted_at", null);

  if (guardia_fecha) query = query.eq("guardia_fecha", guardia_fecha);

  const { data, error } = await query
    .order("hora_desde", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw enriquecerError(error, TABLA_ESTADO);

  return deduplicarEstados((Array.isArray(data) ? data : [])
    .map(normalizarEstadoActual)
    .filter(Boolean));
}

export async function listarOperativosEnCursoActuales({ guardia_fecha } = {}) {
  const estados = await listarEstadosOperativosActuales({ guardia_fecha });
  return estados.filter(estadoEsEnCurso);
}

export async function listarOperativosFinalizadosActuales({ guardia_fecha } = {}) {
  const [estados, eventos] = await Promise.all([
    listarEstadosOperativosActuales({ guardia_fecha }),
    listarEventosFinalizadosActuales({ guardia_fecha }).catch((error) => {
      console.warn("[Informes_GP] No se pudieron leer eventos FINALIZADO; se usa operativos_estado.", error);
      return [];
    })
  ]);

  return deduplicarPorKey([
    ...estados.filter(estadoEsFinalizado),
    ...eventos
  ]);
}

async function listarEventosFinalizadosActuales({ guardia_fecha } = {}) {
  const cliente = await obtenerClienteSupabase();
  if (!cliente) return [];

  let query = cliente
    .from(TABLA_EVENTOS)
    .select("id,operativo_key,guardia_fecha,tipo_evento,payload_completo,created_at")
    .eq("tipo_evento", "FINALIZADO");

  if (guardia_fecha) query = query.eq("guardia_fecha", guardia_fecha);

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1000);
  if (error) throw enriquecerError(error, TABLA_EVENTOS);

  return (Array.isArray(data) ? data : [])
    .map(normalizarEventoFinalizado)
    .filter(Boolean);
}

function normalizarPublicadoActual(row) {
  if (!row || row.activo === false || row.sin_efecto === true) return null;

  const operativoKey = texto(row.operativo_key || construirKeyFallback(row));
  if (!operativoKey) return null;

  const tipoNombre = texto(row.tipo || "OPERATIVO");

  return {
    ...row,
    operativo_key: operativoKey,
    guardia_fecha: texto(row.guardia_fecha || row.fecha_operativo),
    fecha_operativo: texto(row.fecha_operativo),
    hora_inicio: texto(row.hora_desde),
    hora_fin: normalizarHoraFinAbierta(row.hora_hasta),
    lugar: texto(row.lugar || row.lugar_normalizado || "SIN LUGAR"),
    tipo_operativo: normalizarTipo(tipoNombre),
    tipo_nombre: tipoNombre || "OPERATIVO",
    estado: "PROGRAMADO",
    datos: {
      inicio_operativo: row.inicio_operativo || null,
      ordenes_origen: normalizarArray(row.ordenes_origen),
      archivos_origen: normalizarArray(row.archivos_origen),
      registro_original: normalizarObjeto(row.registro_original),
      error_en_la_orden: Boolean(row.error_en_la_orden),
      error_motivo: texto(row.error_motivo)
    }
  };
}

function normalizarEstadoActual(row) {
  if (!row) return null;

  const metadata = normalizarObjeto(row.metadata);
  const operativoKey = texto(row.operativo_key || metadata.operativo_key || construirKeyFallback(row));
  if (!operativoKey) return null;

  const tipoNombre = texto(
    row.tipo_operativo ||
    metadata.tipo_operativo ||
    metadata.tipo_nombre ||
    metadata.titulo ||
    "OPERATIVO"
  );

  return {
    ...row,
    operativo_key: operativoKey,
    guardia_fecha: texto(row.guardia_fecha || row.fecha_operativo),
    fecha_operativo: texto(row.fecha_operativo),
    hora_inicio: texto(row.hora_desde || metadata.hora_inicio || extraerHoraInicio(metadata.horario)),
    hora_fin: normalizarHoraFinAbierta(row.hora_hasta || metadata.hora_fin || extraerHoraFin(metadata.horario)),
    lugar: texto(row.lugar || metadata.lugar || "SIN LUGAR"),
    tipo_operativo: normalizarTipo(tipoNombre),
    tipo_nombre: tipoNombre || "OPERATIVO",
    estado: normalizarEstadoTexto(row.estado, row),
    personal: row.personal || metadata.personal_inicio || metadata.ultimo_personal || metadata.personal || [],
    moviles: row.moviles || metadata.moviles_inicio || metadata.ultimo_moviles || metadata.moviles || [],
    motos: row.motos || metadata.motos_inicio || metadata.ultimo_motos || metadata.motos || [],
    moviles_motos: row.moviles_motos || metadata.moviles_motos || "",
    elementos: row.elementos || metadata.elementos_inicio || metadata.ultimo_elementos || metadata.elementos || {},
    datos: metadata
  };
}

function normalizarEventoFinalizado(row) {
  if (!row) return null;
  const payload = normalizarObjeto(row.payload_completo);
  const franja = normalizarObjeto(payload.franja);
  const operativoKey = texto(row.operativo_key || payload.operativo_key || franja.__operativoKey);
  if (!operativoKey) return null;

  return {
    operativo_key: operativoKey,
    guardia_fecha: texto(row.guardia_fecha || payload.guardia_fecha),
    hora_inicio: texto(payload.hora_inicio || extraerHoraInicio(payload.horario || franja.horario)),
    hora_fin: normalizarHoraFinAbierta(payload.hora_fin || extraerHoraFin(payload.horario || franja.horario)),
    lugar: texto(payload.lugar || franja.lugar || "SIN LUGAR"),
    tipo_operativo: normalizarTipo(payload.tipo_operativo || franja.titulo || "OPERATIVO"),
    tipo_nombre: texto(payload.tipo_nombre || payload.tipo_operativo || franja.titulo || "OPERATIVO"),
    estado: "FINALIZADO",
    datos: payload
  };
}

function estadoEsEnCurso(item) {
  const estado = texto(item?.estado).toUpperCase().replace(/\s+/g, "_");
  if (item?.finalizado_evento_id || ["FINALIZADO", "CERRADO"].includes(estado)) return false;
  if (["EN_CURSO", "INICIADO", "ACTIVO"].includes(estado)) return true;
  return Boolean(item?.inicio_evento_id) && !estado;
}

function estadoEsFinalizado(item) {
  const estado = texto(item?.estado).toUpperCase().replace(/\s+/g, "_");
  return Boolean(item?.finalizado_evento_id) || ["FINALIZADO", "CERRADO"].includes(estado);
}

function normalizarEstadoTexto(valor, row) {
  const estado = texto(valor).toUpperCase().replace(/\s+/g, "_");
  if (row?.finalizado_evento_id || ["FINALIZADO", "CERRADO"].includes(estado)) return "FINALIZADO";
  if (["EN_CURSO", "INICIADO", "ACTIVO"].includes(estado)) return "EN_CURSO";
  if (row?.inicio_evento_id && !estado) return "EN_CURSO";
  return estado;
}

function deduplicarEstados(items) {
  const porKey = new Map();

  for (const item of items) {
    const key = texto(item?.operativo_key);
    if (!key) continue;

    const previo = porKey.get(key);
    if (!previo || timestamp(item.updated_at || item.created_at) > timestamp(previo.updated_at || previo.created_at)) {
      porKey.set(key, item);
    }
  }

  return [...porKey.values()];
}

function deduplicarPorKey(items) {
  const vistos = new Set();
  const salida = [];

  for (const item of items) {
    const key = texto(item?.operativo_key);
    if (!key || vistos.has(key)) continue;
    vistos.add(key);
    salida.push(item);
  }

  return salida;
}

async function obtenerClienteSupabase() {
  const modulo = await import("./supabase-client.js");

  if (typeof modulo.supabaseDisponible === "function" && !modulo.supabaseDisponible()) {
    return null;
  }

  return modulo.supabase || modulo.supabaseClient || modulo.client || null;
}

function normalizarArray(valor) {
  if (Array.isArray(valor)) return valor.map(texto).filter(Boolean);
  if (typeof valor === "string") {
    const raw = valor.trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(texto).filter(Boolean);
    } catch {}
    return raw.split(/[\n,;/]+/).map(texto).filter(Boolean);
  }
  return [];
}

function normalizarObjeto(valor) {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) return valor;
  if (typeof valor === "string" && valor.trim()) {
    try {
      const parsed = JSON.parse(valor);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return {};
}

function construirKeyFallback(row) {
  return [
    row?.guardia_fecha || row?.fecha_operativo || "",
    row?.hora_desde || row?.hora_inicio || "",
    row?.hora_hasta || row?.hora_fin || "",
    row?.lugar || "",
    row?.tipo || row?.tipo_operativo || ""
  ]
    .map((parte) => texto(parte).toLowerCase())
    .filter(Boolean)
    .join("|");
}

function extraerHoraInicio(valor) {
  const match = texto(valor).match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : "";
}

function extraerHoraFin(valor) {
  const fuente = texto(valor);
  const matches = [...fuente.matchAll(/(\d{1,2}:\d{2})/g)];
  if (matches.length > 1) return matches[1][1];
  return /A\s+FINALIZAR/i.test(fuente) ? "FINALIZAR" : "";
}

function normalizarHoraFinAbierta(valor) {
  const limpio = texto(valor);
  return /FINALIZAR/i.test(limpio) ? "FINALIZAR" : limpio;
}

function normalizarTipo(valor) {
  return texto(valor || "GENERICO")
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

function enriquecerError(error, tabla) {
  const mensaje = error?.message || String(error || "Error desconocido");
  const nuevo = new Error(`Error leyendo ${tabla}: ${mensaje}`);
  nuevo.cause = error;
  nuevo.tabla = tabla;
  return nuevo;
}

function timestamp(valor) {
  const n = Date.parse(valor || "");
  return Number.isFinite(n) ? n : 0;
}

function texto(valor) {
  return String(valor ?? "").trim();
}
