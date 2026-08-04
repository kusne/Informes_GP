import { supabase, supabaseDisponible } from "./supabase-client.js";

// La programación y el estado de Informes_GP viven en el mismo proyecto Supabase.
// Se reutiliza un único cliente para evitar conexiones/módulos duplicados.
export const TABLA_OPERATIVOS_PROGRAMADOS_V2 = "bmzcn_operativos_programados_v2";

export const supabaseOperativosProgramados = supabase;

export function obtenerClienteOperativosProgramados() {
  return supabase;
}

export function operativosProgramadosDisponibles() {
  return Boolean(supabaseDisponible() && supabase);
}
