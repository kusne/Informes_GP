import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Proyecto Supabase nuevo compartido por Filtro Órdenes e Informes_GP.
// Cliente dedicado de lectura de bmzcn_operativos_programados_v2.
// El cliente general de Informes_GP ya usa el mismo proyecto nuevo para las escrituras.
const SUPABASE_OPERATIVOS_URL = "https://hbnxvwrqxhurdteirsyl.supabase.co";
const SUPABASE_OPERATIVOS_PUBLISHABLE_KEY = "sb_publishable_GgrICSZSYl6Fc5D8SzT-aA_GLCB9J01";

export const TABLA_OPERATIVOS_PROGRAMADOS_V2 = "bmzcn_operativos_programados_v2";

export const supabaseOperativosProgramados = crearClienteOperativosProgramados();

export function obtenerClienteOperativosProgramados() {
  return supabaseOperativosProgramados;
}

export function operativosProgramadosDisponibles() {
  return Boolean(supabaseOperativosProgramados);
}

function crearClienteOperativosProgramados() {
  try {
    return createClient(
      SUPABASE_OPERATIVOS_URL,
      SUPABASE_OPERATIVOS_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
  } catch (error) {
    console.error("[Informes_GP] No se pudo crear el cliente del nuevo Supabase de operativos:", error);
    return null;
  }
}
