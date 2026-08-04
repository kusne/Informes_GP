import {
  normalizarOperativosProgramadosV2
} from "./operativos-programados-v2-mapper.js";

const SUPABASE_URL = "https://hbnxvwrqxhurdteirsyl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GgrICSZSYl6Fc5D8SzT-aA_GLCB9J01";

const TABLA_PROGRAMADOS = "bmzcn_operativos_programados_v2";
const TABLA_ESTADO = "bmzcn_operativos_estado_v2";

const SELECT_PROGRAMADOS = [
  "id",
  "orden_publicada_id",
  "operativo_key",
  "lote_guardia_id",
  "publicacion_lote_id",
  "guardia_fecha",
  "fecha_operativo",
  "inicio_operativo",
  "hora_desde",
  "hora_hasta",
  "lugar",
  "lugar_normalizado",
  "tipo",
  "ordenes_origen",
  "archivos_origen",
  "activo",
  "sin_efecto",
  "sin_efecto_motivo",
  "sin_efecto_updated_at",
  "error_en_la_orden",
  "error_motivo",
  "registro_original",
  "created_at",
  "updated_at"
].join(",");

/**
 * Lectura crítica de arranque por REST nativo.
 *
 * Motivo: no cargar @supabase/supabase-js desde CDN para poder llenar el
 * selector inicial. La SDK completa queda para escrituras, Storage y Realtime,
 * que se cargan después de que la pantalla ya está visible.
 */
export async function listarOperativosProgramadosRestRapido({
  guardia_fecha,
  activo = true,
  excluir_sin_efecto = true
} = {}) {
  const filtros = {
    select: SELECT_PROGRAMADOS,
    order: "inicio_operativo.asc"
  };

  if (guardia_fecha) filtros.guardia_fecha = `eq.${guardia_fecha}`;
  if (activo !== null && activo !== undefined) filtros.activo = `eq.${Boolean(activo)}`;
  if (excluir_sin_efecto) filtros.sin_efecto = "eq.false";

  const data = await consultarRest(TABLA_PROGRAMADOS, filtros);
  return deduplicarProgramados(normalizarOperativosProgramadosV2(data));
}

export async function listarEstadosOperativosRestRapido({
  guardia_fecha
} = {}) {
  const filtros = {
    select: "*",
    order: "hora_inicio.asc,updated_at.desc"
  };

  if (guardia_fecha) filtros.guardia_fecha = `eq.${guardia_fecha}`;

  const data = await consultarRest(TABLA_ESTADO, filtros);
  return normalizarEstados(data);
}

async function consultarRest(tabla, filtros = {}) {
  const url = new URL(`/rest/v1/${tabla}`, SUPABASE_URL);

  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor === undefined || valor === null || valor === "") continue;
    url.searchParams.set(clave, String(valor));
  }

  const respuesta = await fetch(url.href, {
    method: "GET",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Accept: "application/json"
    },
    cache: "no-store",
    credentials: "omit"
  });

  if (!respuesta.ok) {
    let detalle = "";
    try {
      const body = await respuesta.json();
      detalle = body?.message || body?.error || body?.hint || "";
    } catch {
      try {
        detalle = await respuesta.text();
      } catch {}
    }

    throw new Error(
      `No se pudo leer ${tabla} por REST (${respuesta.status})${detalle ? `: ${detalle}` : ""}`
    );
  }

  const data = await respuesta.json();
  return Array.isArray(data) ? data : [];
}

function deduplicarProgramados(items = []) {
  const mapa = new Map();

  for (const item of items) {
    const key = texto(item?.operativo_key);
    if (!key) continue;

    const anterior = mapa.get(key);
    if (!anterior || timestamp(item.updated_at) >= timestamp(anterior.updated_at)) {
      mapa.set(key, item);
    }
  }

  return Array.from(mapa.values()).sort((a, b) => {
    const porInicio = timestamp(a.inicio_operativo) - timestamp(b.inicio_operativo);
    if (porInicio !== 0) return porInicio;
    return texto(a.operativo_key).localeCompare(texto(b.operativo_key));
  });
}

function normalizarEstados(data) {
  if (!Array.isArray(data)) return [];

  return data
    .map((op) => {
      if (!op) return null;

      return {
        ...op,
        operativo_key: texto(op.operativo_key || op.id_operativo || op.id),
        guardia_fecha: texto(op.guardia_fecha || op.fecha_guardia || op.fecha),
        hora_inicio: texto(op.hora_inicio),
        hora_fin: texto(op.hora_fin || op.hora_finalizacion),
        lugar: texto(op.lugar || op.qth || op.ubicacion || "SIN LUGAR"),
        tipo_operativo: normalizarTipo(op.tipo_operativo || op.tipo || "GENERICO"),
        tipo_nombre: texto(op.tipo_nombre || op.tipo_operativo || op.tipo || "OPERATIVO"),
        estado: texto(op.estado).toUpperCase(),
        datos: normalizarJson(op.datos)
      };
    })
    .filter((op) => Boolean(op?.operativo_key));
}

function normalizarTipo(valor) {
  return texto(valor || "GENERICO")
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

function normalizarJson(valor) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  return valor;
}

function timestamp(valor) {
  const n = Date.parse(valor || "");
  return Number.isFinite(n) ? n : 0;
}

function texto(valor) {
  return String(valor ?? "").trim();
}
