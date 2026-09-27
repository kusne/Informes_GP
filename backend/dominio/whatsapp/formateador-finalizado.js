import { construirTextoFinalizadoBase } from "../finaliza/finalizado-salida-texto-base.js";

export function obtenerSalidaFinalizadoDesdeEstado(estado = {}, { alEnviar = false, ahora = new Date() } = {}) {
  const salida = {
    texto: estado.finalizadoTexto || "",
    errores: Array.isArray(estado.finalizadoErrores) ? estado.finalizadoErrores : [],
    payload: estado.finalizadoSupabasePayload || null
  };

  // No alterar la vista previa ni los operativos cuyo fin ya tiene una hora.
  // Sólo al pulsar Enviar, reemplazar A FINALIZAR por la hora de ese momento.
  const actual = estado.finalizadoActual;
  if (!alEnviar || !actual || !salida.payload) return salida;

  const operativo = actual.operativo || estado.operativoSeleccionado || {};
  const finOriginal = String(
    operativo.hora_fin || operativo.hora_finalizacion || operativo.fin || actual.hora_fin || ""
  ).trim();
  const franja = String(operativo.franja_horaria || operativo.horario || "").trim();
  const finAbierto = /^(?:A\s+)?FINALIZAR(?:\s+HS\.?)?$/i.test(finOriginal) ||
    /\bA\s+FINALIZAR\b/i.test(`${finOriginal} ${franja}`);
  if (!finAbierto) return salida;

  const fecha = ahora instanceof Date ? ahora : new Date(ahora);
  if (!Number.isFinite(fecha.getTime())) return salida;

  const horaReal = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Argentina/Cordoba",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(fecha);

  const texto = construirTextoFinalizadoBase({ ...actual, hora_fin: horaReal });
  return {
    ...salida,
    texto,
    payload: { ...salida.payload, hora_fin: horaReal, texto_salida: texto }
  };
}
