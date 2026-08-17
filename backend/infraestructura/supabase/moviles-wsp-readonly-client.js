import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/**
 * Cliente SECUNDARIO de Informes GP para consultar el padrón de móviles
 * alojado en el proyecto Supabase que utiliza WSP/BMZCN.
 *
 * CONTRATO DE ESTA ETAPA:
 * - SOLO LECTURA.
 * - No exporta funciones de insert/update/upsert/delete.
 * - No reemplaza al cliente Supabase principal de Informes GP.
 */
const SUPABASE_MOVILES_WSP_URL = "https://ugeydxozfewzhldjbkat.supabase.co";
const SUPABASE_MOVILES_WSP_PUBLISHABLE_KEY = "sb_publishable_ZeLC2rOxhhUXlQdvJ28JkA_qf802-pX";

const TABLA_MOVILES = "moviles_bmzcn";
const SELECT_PADRON = [
  "id",
  "numero",
  "tipo",
  "modelo",
  "dominio",
  "kilometraje",
  "combustible",
  "observaciones_novedades",
  "condicion",
  "activo"
].join(",");

let clienteMovilesWsp = null;

export function obtenerClienteMovilesWspSoloLectura() {
  if (clienteMovilesWsp) return clienteMovilesWsp;

  clienteMovilesWsp = createClient(
    SUPABASE_MOVILES_WSP_URL,
    SUPABASE_MOVILES_WSP_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      realtime: {
        params: { eventsPerSecond: 1 }
      }
    }
  );

  return clienteMovilesWsp;
}

export async function listarPadronMovilesWspSoloLectura({
  soloActivos = true
} = {}) {
  const cliente = obtenerClienteMovilesWspSoloLectura();

  let query = cliente
    .from(TABLA_MOVILES)
    .select(SELECT_PADRON)
    .order("numero", { ascending: true });

  if (soloActivos) query = query.eq("activo", true);

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `No se pudo leer el padrón de móviles WSP (${error.code || "sin-codigo"}): ${error.message || error}`
    );
  }

  return (Array.isArray(data) ? data : [])
    .map(normalizarMovil)
    .filter((movil) => Boolean(movil.numero));
}

export async function diagnosticarPadronMovilesWspSoloLectura() {
  const moviles = await listarPadronMovilesWspSoloLectura({ soloActivos: true });

  return {
    ok: true,
    proyecto: "WSP_BMZCN",
    tabla: TABLA_MOVILES,
    modo: "SOLO_LECTURA",
    total: moviles.length,
    numeros: moviles.map((movil) => movil.numero),
    moviles
  };
}

function normalizarMovil(row = {}) {
  return {
    id: texto(row.id),
    numero: texto(row.numero),
    tipo: texto(row.tipo),
    modelo: texto(row.modelo),
    dominio: texto(row.dominio),
    kilometraje: numeroNoNegativo(row.kilometraje),
    combustible: texto(row.combustible),
    observaciones_novedades: texto(row.observaciones_novedades),
    condicion: Boolean(row.condicion),
    activo: row.activo !== false
  };
}

function numeroNoNegativo(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function texto(valor) {
  return String(valor ?? "").trim();
}
