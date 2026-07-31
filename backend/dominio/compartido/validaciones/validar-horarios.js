import {
  normalizarHora,
  duracionRangoMinutos
} from "../fechas/horas.js";

export function validarHorario(hora, nombreCampo = "hora") {
  const normalizada = normalizarHora(hora);

  if (!normalizada) {
    return [`${nombreCampo} inválida.`];
  }

  return [];
}

export function validarRangoHorario({ horaInicio, horaFin }) {
  const errores = [];

  errores.push(...validarHorario(horaInicio, "Hora de inicio"));
  errores.push(...validarHorario(horaFin, "Hora de finalización"));

  if (errores.length) {
    return errores;
  }

  const duracion = duracionRangoMinutos(horaInicio, horaFin);

  if (duracion <= 0) {
    errores.push("El rango horario no puede tener duración cero.");
  }

  return errores;
}
