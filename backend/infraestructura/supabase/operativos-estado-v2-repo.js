import { TABLAS_SUPABASE } from "./supabase-client.js";

const TABLA_OPERATIVOS_ESTADO = TABLAS_SUPABASE.operativosEstado;

export async function listarOperativosEnCursoV2({
  guardia_fecha
} = {}) {
  const cliente = await obtenerClienteSupabase();

  if (!cliente) {
    console.warn("[Informes_GP] Supabase no disponible para listar operativos en curso.");
    return [];
  }

  let query = cliente
    .from(TABLA_OPERATIVOS_ESTADO)
    .select("*")
    .eq("estado", "EN_CURSO");

  if (guardia_fecha) {
    query = query.eq("guardia_fecha", guardia_fecha);
  }

  query = query
    .order("hora_inicio", { ascending: true })
    .order("hora_fin", { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return normalizarEstados(data);
}

export async function listarOperativosFinalizadosV2({
  guardia_fecha
} = {}) {
  const cliente = await obtenerClienteSupabase();

  if (!cliente) {
    console.warn("[Informes_GP] Supabase no disponible para listar operativos finalizados.");
    return [];
  }

  let query = cliente
    .from(TABLA_OPERATIVOS_ESTADO)
    .select("*")
    .eq("estado", "FINALIZADO");

  if (guardia_fecha) {
    query = query.eq("guardia_fecha", guardia_fecha);
  }

  query = query
    .order("hora_fin", { ascending: true })
    .order("updated_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return normalizarEstados(data);
}

export async function obtenerEstadoOperativoV2({
  guardia_fecha,
  operativo_key
} = {}) {
  const cliente = await obtenerClienteSupabase();

  if (!cliente || !operativo_key) {
    return null;
  }

  let query = cliente
    .from(TABLA_OPERATIVOS_ESTADO)
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

  return data ? normalizarEstado(data) : null;
}

export async function guardarInicioOperativoV2(payload) {
  const cliente = await obtenerClienteSupabase();

  if (!cliente) {
    console.warn("[Informes_GP] Supabase no disponible. Inicio no guardado.");
    return {
      ok: false,
      saltado: true,
      data: null
    };
  }

  const limpio = limpiarPayloadInicio(payload);

  validarClaveBasica(limpio, "INICIO");

  const existente = await obtenerEstadoOperativoV2({
    guardia_fecha: limpio.guardia_fecha,
    operativo_key: limpio.operativo_key
  });

  if (existente?.estado === "FINALIZADO") {
    throw new Error("No se puede actualizar INICIO porque el operativo ya está FINALIZADO.");
  }

  if (existente) {
    const { data, error } = await cliente
      .from(TABLA_OPERATIVOS_ESTADO)
      .update({
        ...limpio,
        estado: "EN_CURSO",
        tipo_evento: "INICIO",
        updated_at: new Date().toISOString()
      })
      .eq("id", existente.id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  const { data, error } = await cliente
    .from(TABLA_OPERATIVOS_ESTADO)
    .insert({
      ...limpio,
      estado: "EN_CURSO",
      tipo_evento: "INICIO"
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function guardarFinalizadoOperativoV2(payload) {
  const cliente = await obtenerClienteSupabase();

  if (!cliente) {
    console.warn("[Informes_GP] Supabase no disponible. Finalizado no guardado.");
    return {
      ok: false,
      saltado: true,
      data: null
    };
  }

  const limpio = limpiarPayloadFinalizado(payload);

  validarClaveBasica(limpio, "FINALIZADO");

  const existente = await obtenerEstadoOperativoV2({
    guardia_fecha: limpio.guardia_fecha,
    operativo_key: limpio.operativo_key
  });

  if (!existente) {
    throw new Error("No se puede FINALIZAR: primero debe existir un INICIO en curso.");
  }

  const datosFusionados = fusionarDatosJson(existente.datos, limpio.datos);

  const { data, error } = await cliente
    .from(TABLA_OPERATIVOS_ESTADO)
    .update({
      ...limpio,
      datos: datosFusionados,
      estado: "FINALIZADO",
      tipo_evento: "FINALIZADO",
      updated_at: new Date().toISOString()
    })
    .eq("id", existente.id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function borrarFinalizadoOperativoV2({
  guardia_fecha,
  operativo_key
} = {}) {
  const cliente = await obtenerClienteSupabase();

  if (!cliente || !operativo_key) return null;

  const existente = await obtenerEstadoOperativoV2({
    guardia_fecha,
    operativo_key
  });

  if (!existente) return null;

  if (existente.estado !== "FINALIZADO") {
    return existente;
  }

  const datos = fusionarDatosJson(existente.datos, {
    finalizado_borrado: true,
    finalizado_borrado_at: new Date().toISOString()
  });

  const { data, error } = await cliente
    .from(TABLA_OPERATIVOS_ESTADO)
    .update({
      estado: "EN_CURSO",
      tipo_evento: "INICIO",
      actas: 0,
      personas: 0,
      vehiculos: 0,
      numerales_texto: "",
      numerales_items: [],
      numerales_resumen: "",
      datos,
      updated_at: new Date().toISOString()
    })
    .eq("id", existente.id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function borrarInicioOperativoV2({
  guardia_fecha,
  operativo_key
} = {}) {
  const cliente = await obtenerClienteSupabase();

  if (!cliente || !operativo_key) return null;

  let query = cliente
    .from(TABLA_OPERATIVOS_ESTADO)
    .delete()
    .eq("operativo_key", operativo_key);

  if (guardia_fecha) {
    query = query.eq("guardia_fecha", guardia_fecha);
  }

  const { data, error } = await query.select();

  if (error) throw error;

  return data;
}

function limpiarPayloadInicio(payload = {}) {
  return limpiarObjeto({
    guardia_fecha: texto(payload.guardia_fecha),
    operativo_key: texto(payload.operativo_key),
    tipo_evento: "INICIO",
    estado: "EN_CURSO",
    tipo_operativo: normalizarTipo(payload.tipo_operativo || "GENERICO"),
    tipo_nombre: texto(payload.tipo_nombre || payload.tipo_operativo || ""),
    hora_inicio: texto(payload.hora_inicio),
    hora_fin: texto(payload.hora_fin),
    lugar: texto(payload.lugar),
    personal: texto(payload.personal),
    moviles_motos: texto(payload.moviles_motos),
    elementos: texto(payload.elementos),
    observaciones: texto(payload.observaciones),
    texto_salida: texto(payload.texto_salida),
    origen: texto(payload.origen || "Informes_GP"),
    datos: normalizarJson(payload.datos),
    fecha_evento: payload.fecha_evento || new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

function limpiarPayloadFinalizado(payload = {}) {
  return limpiarObjeto({
    guardia_fecha: texto(payload.guardia_fecha),
    operativo_key: texto(payload.operativo_key),
    tipo_evento: "FINALIZADO",
    estado: "FINALIZADO",
    tipo_operativo: normalizarTipo(payload.tipo_operativo || "GENERICO"),
    tipo_nombre: texto(payload.tipo_nombre || payload.tipo_operativo || ""),
    hora_inicio: texto(payload.hora_inicio),
    hora_fin: texto(payload.hora_fin),
    lugar: texto(payload.lugar),
    actas: numero(payload.actas),
    personas: numero(payload.personas),
    vehiculos: numero(payload.vehiculos),
    numerales_texto: texto(payload.numerales_texto),
    numerales_items: Array.isArray(payload.numerales_items) ? payload.numerales_items : [],
    numerales_resumen: texto(payload.numerales_resumen),
    observaciones: texto(payload.observaciones),
    texto_salida: texto(payload.texto_salida),
    origen: texto(payload.origen || "Informes_GP"),
    datos: normalizarJson(payload.datos),
    fecha_evento: payload.fecha_evento || new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

function validarClaveBasica(payload, tipo) {
  if (!payload.guardia_fecha) {
    throw new Error(`No se puede guardar ${tipo}: falta guardia_fecha.`);
  }

  if (!payload.operativo_key) {
    throw new Error(`No se puede guardar ${tipo}: falta operativo_key.`);
  }
}

function normalizarEstados(data) {
  if (!Array.isArray(data)) return [];

  return data
    .map(normalizarEstado)
    .filter((op) => op.operativo_key);
}

function normalizarEstado(op) {
  if (!op) return null;

  return {
    ...op,
    operativo_key: texto(op.operativo_key || op.id_operativo || op.id || ""),
    guardia_fecha: texto(op.guardia_fecha || op.fecha_guardia || op.fecha || ""),
    hora_inicio: texto(op.hora_inicio || ""),
    hora_fin: texto(op.hora_fin || op.hora_finalizacion || ""),
    lugar: texto(op.lugar || op.qth || op.ubicacion || "SIN LUGAR"),
    tipo_operativo: normalizarTipo(op.tipo_operativo || op.tipo || "GENERICO"),
    tipo_nombre: texto(op.tipo_nombre || op.tipo_operativo || op.tipo || "OPERATIVO"),
    estado: texto(op.estado).toUpperCase(),
    datos: normalizarJson(op.datos)
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

function normalizarTipo(valor) {
  return texto(valor || "GENERICO")
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

function texto(valor) {
  return String(valor || "").trim();
}

function numero(valor) {
  const n = Number(valor || 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function normalizarJson(valor) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(valor));
  } catch {
    return {};
  }
}

function fusionarDatosJson(base, agregado) {
  return {
    ...normalizarJson(base),
    ...normalizarJson(agregado)
  };
}

function limpiarObjeto(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, valor]) => valor !== undefined)
  );
}
