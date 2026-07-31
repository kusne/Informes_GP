const TABLA_CONTROL_MOVILES = "control_moviles_novedades";

export async function guardarNovedadMovil(payload) {
  const cliente = await obtenerClienteSupabase();

  if (!cliente) {
    console.warn("[Informes_GP] Supabase no disponible para guardar control de móviles.");
    return {
      ok: false,
      saltado: true,
      data: null
    };
  }

  const limpio = limpiarPayload(payload);

  if (!limpio.unidad || !limpio.estado) {
    throw new Error("Faltan unidad o estado para guardar novedad de móvil.");
  }

  const { data, error } = await cliente
    .from(TABLA_CONTROL_MOVILES)
    .insert(limpio)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listarHistorialNovedadesMoviles({
  guardia_fecha,
  limite = 20
} = {}) {
  const cliente = await obtenerClienteSupabase();

  if (!cliente) return [];

  let query = cliente
    .from(TABLA_CONTROL_MOVILES)
    .select("*")
    .order("fecha_evento", {
      ascending: false
    })
    .limit(limite);

  if (guardia_fecha) {
    query = query.eq("guardia_fecha", guardia_fecha);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export async function listarUltimoEstadoMoviles({
  guardia_fecha
} = {}) {
  const historial = await listarHistorialNovedadesMoviles({
    guardia_fecha,
    limite: 100
  });

  const mapa = new Map();

  for (const novedad of historial) {
    const unidad = normalizarUnidad(novedad.unidad);
    if (!unidad) continue;

    if (!mapa.has(unidad)) {
      mapa.set(unidad, novedad);
    }
  }

  return Array.from(mapa.values());
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

function limpiarPayload(payload = {}) {
  return limpiarObjeto({
    guardia_fecha: payload.guardia_fecha || "",
    fecha_evento: payload.fecha_evento || payload.fecha || new Date().toISOString(),
    unidad: String(payload.unidad || "").trim(),
    estado: String(payload.estado || "").trim(),
    kilometraje: numero(payload.kilometraje),
    combustible: String(payload.combustible || "").trim(),
    chofer: String(payload.chofer || "").trim(),
    observaciones: String(payload.observaciones || "").trim(),
    texto_salida: String(payload.texto_salida || "").trim(),
    origen: payload.origen || "Informes_GP"
  });
}

function normalizarUnidad(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function numero(valor) {
  const n = Number(valor || 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function limpiarObjeto(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, valor]) => valor !== undefined)
  );
}