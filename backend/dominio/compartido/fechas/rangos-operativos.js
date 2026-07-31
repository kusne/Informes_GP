import {
  obtenerInicioGuardia0600,
  obtenerFinGuardia0600
} from "./guardia-0600.js";
import {
  normalizarHora,
  rangoCruzaMedianoche,
  duracionRangoMinutos
} from "./horas.js";

export function construirRangoOperativo({
  guardiaFecha,
  horaInicio,
  horaFin
}) {
  const inicioGuardia = obtenerInicioGuardia0600(guardiaFecha);
  const inicio = construirFechaHora(inicioGuardia, horaInicio);
  const fin = construirFechaHora(inicioGuardia, horaFin);

  if (rangoCruzaMedianoche(horaInicio, horaFin)) {
    fin.setDate(fin.getDate() + 1);
  }

  return {
    inicio,
    fin,
    duracion_minutos: duracionRangoMinutos(horaInicio, horaFin)
  };
}

export function operativoDentroDeGuardia({
  guardiaFecha,
  horaInicio,
  horaFin
}) {
  const rango = construirRangoOperativo({
    guardiaFecha,
    horaInicio,
    horaFin
  });

  const inicioGuardia = obtenerInicioGuardia0600(guardiaFecha);
  const finGuardia = obtenerFinGuardia0600(guardiaFecha);

  return rango.inicio >= inicioGuardia && rango.fin <= finGuardia;
}

export function formatearRangoOperativo(operativo) {
  const inicio = normalizarHora(operativo?.hora_inicio) || "--:--";
  const fin = normalizarHora(operativo?.hora_fin) || "--:--";

  return `${inicio} A ${fin} HS`;
}

function construirFechaHora(base, hora) {
  const normalizada = normalizarHora(hora);
  const d = new Date(base.getTime());

  if (!normalizada) {
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const [h, m] = normalizada.split(":").map(Number);
  d.setHours(h, m, 0, 0);

  return d;
}
