import { obtenerSupabaseClient } from "./supabase-client.js";
import { crearCatalogoGuardia } from "../../dominio/compartido/recursos/recursos-guardia-dominio.js";

const TABLA_PERSONAL = "personal_bmzcn";
const TABLA_MOVILES = "moviles_bmzcn";

export async function consultarRecursosGuardiaV2(ahora = new Date()) {
  const cliente = obtenerSupabaseClient();
  if (!cliente) throw new Error("No hay conexión configurada con bmzcn-v2-desarrollo.");
  const [personal, movilidad] = await Promise.all([
    cliente.from(TABLA_PERSONAL)
      .select("id,jerarquia,ni,nombre_apellido,grupo,rol,situacion_revista,presente,activo")
      .eq("activo", true),
    cliente.from(TABLA_MOVILES)
      .select("numero,tipo,condicion,activo")
      .eq("activo", true).eq("condicion", true)
  ]);
  if (personal.error) throw new Error("Error leyendo PERSONAL: " + personal.error.message);
  if (movilidad.error) throw new Error("Error leyendo MÓVILES: " + movilidad.error.message);
  return crearCatalogoGuardia(personal.data || [], movilidad.data || [], ahora);
}

export function observarRecursosGuardiaV2({ onCambio, onEstado } = {}) {
  const cliente = obtenerSupabaseClient();
  if (!cliente) throw new Error("No hay conexión configurada con bmzcn-v2-desarrollo.");
  const canal = cliente.channel("igp-recursos-guardia-" + Math.random().toString(36).slice(2));
  [TABLA_PERSONAL, TABLA_MOVILES].forEach((tabla) => {
    canal.on("postgres_changes", { event: "*", schema: "public", table: tabla }, () => onCambio?.(tabla));
  });
  canal.subscribe((estado) => {
    onEstado?.(estado);
    // La lectura posterior a SUBSCRIBED cierra la ventana entre la primera
    // consulta y el establecimiento de la suscripción.
    if (estado === "SUBSCRIBED") onCambio?.("SUSCRIPCION_ACTIVA");
  });
  return () => cliente.removeChannel(canal);
}
