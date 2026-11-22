import { obtenerEstadoOperativoV2 } from "./operativos-estado-v2-repo.js";
import { supabase, TABLAS_SUPABASE } from "./supabase-client.js";
import { prepararCambioPresenciaActiva } from "../../dominio/presencia-activa/presencia-activa.js";

// Actualización optimista de la misma fila: no crea otro operativo, no cambia
// EN_CURSO, no reemplaza el INICIO ni altera movimientos, órdenes o procedimientos.
export async function guardarCambioPresenciaActiva({
  guardia_fecha, operativo_key, expected_updated_at, accion, motivo,
  otro_motivo, hora_reporte, observacion_adicional, adjunta_vista
} = {}) {
  if (!supabase) throw Error("Sin conexión con Supabase. No se registró el evento.");
  if (!guardia_fecha || !operativo_key || !expected_updated_at) {
    throw Error("Falta identificar el operativo y la versión actual del INICIO.");
  }

  const operativo = await obtenerEstadoOperativoV2({ guardia_fecha, operativo_key });
  if (!operativo || operativo.estado !== "EN_CURSO") {
    throw Error("El operativo ya no está EN CURSO. No puede registrarse Presencia Activa.");
  }
  if (operativo.updated_at !== expected_updated_at) {
    throw Error("El operativo cambió en otro dispositivo. Volvé a abrirlo para registrar el evento.");
  }

  const fecha_evento = new Date().toISOString();
  const preparado = prepararCambioPresenciaActiva({
    operativo, accion, motivo, otro_motivo, hora_reporte,
    observacion_adicional, adjunta_vista, fecha_evento
  });
  const anteriores = operativo.datos && typeof operativo.datos === "object" && !Array.isArray(operativo.datos)
    ? operativo.datos : {};
  const historial = Array.isArray(anteriores.presencia_activa_eventos)
    ? anteriores.presencia_activa_eventos : [];
  const datos = {
    ...anteriores,
    presencia_activa: {
      activa: accion === "INICIAR",
      ultima_transicion: fecha_evento,
      motivo: accion === "INICIAR" ? preparado.evento.motivo_descripcion : ""
    },
    presencia_activa_eventos: [...historial, preparado.evento]
  };

  const { data, error } = await supabase.from(TABLAS_SUPABASE.operativosEstado)
    .update({ datos, updated_at: fecha_evento })
    .eq("id", operativo.id)
    .eq("guardia_fecha", guardia_fecha)
    .eq("operativo_key", operativo_key)
    .eq("estado", "EN_CURSO")
    .eq("updated_at", expected_updated_at)
    .select("id,updated_at,datos").maybeSingle();
  if (error) throw error;
  if (!data) {
    throw Error("La situación del operativo cambió mientras se guardaba. Reabrí el formulario; no se registró el evento.");
  }

  return {
    ok: true,
    texto: preparado.texto,
    evento: preparado.evento,
    activa: accion === "INICIAR",
    updated_at: data.updated_at
  };
}
