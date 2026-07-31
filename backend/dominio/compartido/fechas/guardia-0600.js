export function obtenerGuardiaFecha0600(fecha = new Date()) {
  const d = normalizarFecha(fecha);

  if (d.getHours() < 6) {
    d.setDate(d.getDate() - 1);
  }

  return formatearFechaISO(d);
}

export function obtenerInicioGuardia0600(guardiaFecha = obtenerGuardiaFecha0600()) {
  const d = parsearFechaISO(guardiaFecha);
  d.setHours(6, 0, 0, 0);
  return d;
}

export function obtenerFinGuardia0600(guardiaFecha = obtenerGuardiaFecha0600()) {
  const d = parsearFechaISO(guardiaFecha);
  d.setDate(d.getDate() + 1);
  d.setHours(6, 0, 0, 0);
  return d;
}

export function fechaPerteneceAGuardia0600(fecha, guardiaFecha) {
  const d = normalizarFecha(fecha);
  const inicio = obtenerInicioGuardia0600(guardiaFecha);
  const fin = obtenerFinGuardia0600(guardiaFecha);

  return d >= inicio && d < fin;
}

export function formatearFechaISO(fecha) {
  const d = normalizarFecha(fecha);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export function parsearFechaISO(valor) {
  const texto = String(valor || "").trim();
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    throw new Error(`Fecha inválida: ${valor}`);
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
}

function normalizarFecha(fecha) {
  if (fecha instanceof Date) {
    return new Date(fecha.getTime());
  }

  const d = new Date(fecha);

  if (Number.isNaN(d.getTime())) {
    return new Date();
  }

  return d;
}
