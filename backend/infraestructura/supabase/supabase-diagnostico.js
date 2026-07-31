import {
  supabase,
  supabaseDisponible,
  obtenerConfigSupabase,
  TABLAS_SUPABASE,
  TABLAS_REALTIME_INFORMES_GP
} from "./supabase-client.js";
import { estaRealtimeInformesGPActivo } from "./supabase-realtime.js";

const TABLAS_DIAGNOSTICO = TABLAS_REALTIME_INFORMES_GP;

const BUCKET_FOTOS = "operativos-historial-fotos";

export async function ejecutarDiagnosticoSupabase({
  guardia_fecha
} = {}) {
  const resultado = {
    fecha: new Date().toISOString(),
    guardia_fecha: String(guardia_fecha || window.InformesGP?.guardiaFecha || "").trim(),
    supabase: {
      configurado: false,
      url: "",
      error: ""
    },
    tablas: {},
    storage: {
      bucket: BUCKET_FOTOS,
      disponible: false,
      error: ""
    },
    realtime: {
      activo: false
    },
    ok: false,
    errores: []
  };

  const config = obtenerConfigSegura();

  resultado.supabase.configurado = Boolean(supabaseDisponible() && supabase);
  resultado.supabase.url = config.url || "";

  if (!resultado.supabase.configurado) {
    resultado.supabase.error = "Supabase no está configurado o no se pudo crear el cliente.";
    resultado.errores.push(resultado.supabase.error);
    resultado.ok = false;
    return resultado;
  }

  for (const tabla of TABLAS_DIAGNOSTICO) {
    resultado.tablas[tabla] = await diagnosticarTabla(tabla, resultado.guardia_fecha);

    if (!resultado.tablas[tabla].ok) {
      resultado.errores.push(`${tabla}: ${resultado.tablas[tabla].error}`);
    }
  }

  resultado.storage = await diagnosticarStorage();

  if (!resultado.storage.disponible) {
    resultado.errores.push(`Storage ${BUCKET_FOTOS}: ${resultado.storage.error}`);
  }

  resultado.realtime.activo = estaRealtimeInformesGPActivo();

  resultado.ok =
    resultado.supabase.configurado &&
    Object.values(resultado.tablas).every((t) => t.ok) &&
    resultado.storage.disponible;

  return resultado;
}

export async function diagnosticarTabla(tabla, guardiaFecha = "") {
  try {
    let query = supabase
      .from(tabla)
      .select("*", {
        count: "exact",
        head: true
      });

    if (guardiaFecha && tabla !== TABLAS_SUPABASE.controlMoviles) {
      query = query.eq("guardia_fecha", guardiaFecha);
    }

    const { count, error } = await query;

    if (error) {
      return {
        ok: false,
        count: 0,
        error: error.message || String(error)
      };
    }

    return {
      ok: true,
      count: Number(count || 0),
      error: ""
    };
  } catch (error) {
    return {
      ok: false,
      count: 0,
      error: error?.message || String(error)
    };
  }
}

export async function diagnosticarStorage() {
  try {
    const { data, error } = await supabase.storage.getBucket(BUCKET_FOTOS);

    if (error) {
      return {
        bucket: BUCKET_FOTOS,
        disponible: false,
        error: error.message || String(error)
      };
    }

    return {
      bucket: BUCKET_FOTOS,
      disponible: Boolean(data),
      publico: Boolean(data?.public),
      error: ""
    };
  } catch (error) {
    return {
      bucket: BUCKET_FOTOS,
      disponible: false,
      error: error?.message || String(error)
    };
  }
}

function obtenerConfigSegura() {
  try {
    return obtenerConfigSupabase();
  } catch {
    return {
      url: "",
      anonKey: "",
      configurado: false
    };
  }
}
