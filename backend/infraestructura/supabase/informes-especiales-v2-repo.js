import { crearResultadoSupabaseSaltado } from "./supabase-client.js";

export async function guardarInformeEspecialV2(payload) {
  return crearResultadoSupabaseSaltado("Informes no persistido: no hay tabla Supabase definitiva para este modo.");
}

export async function listarInformesEspecialesV2({
  guardia_fecha,
  operativo_key,
  tipo_informe,
  limite = 50
} = {}) {
  return [];
}

function limpiarPayloadInformeEspecial(payload = {}) {
  return limpiarObjeto({
    guardia_fecha: payload.guardia_fecha || "",
    operativo_key: payload.operativo_key || "",
    tipo_informe: normalizarModelo(payload.tipo_informe || payload.modelo || ""),
    tipo_operativo: normalizarTipo(payload.tipo_operativo || "GENERICO"),
    hora_inicio: payload.hora_inicio || "",
    hora_fin: payload.hora_fin || "",
    lugar: payload.lugar || "",
    datos: payload.datos || {},
    calculos: payload.calculos || {},
    texto_salida: payload.texto_salida || "",
    origen: payload.origen || "Informes_GP",
    fecha_evento: payload.fecha_evento || payload.fecha || new Date().toISOString()
  });
}

function validarInformeEspecial(payload) {
  if (!payload.guardia_fecha) {
    throw new Error("No se puede guardar informe especial: falta guardia_fecha.");
  }

  if (!payload.operativo_key) {
    throw new Error("No se puede guardar informe especial: falta operativo_key.");
  }

  if (!payload.tipo_informe) {
    throw new Error("No se puede guardar informe especial: falta tipo_informe.");
  }

  if (!payload.texto_salida) {
    throw new Error("No se puede guardar informe especial: falta texto_salida.");
  }
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

function normalizarModelo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

function normalizarTipo(valor) {
  return String(valor || "GENERICO")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

function limpiarObjeto(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, valor]) => valor !== undefined)
  );
}
