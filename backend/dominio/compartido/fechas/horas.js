export function normalizarHora(valor) {
  const texto = String(valor || "").trim();

  const match = texto.match(/^(\d{1,2})[:.](\d{2})$/);

  if (!match) {
    return "";
  }

  const h = Number(match[1]);
  const m = Number(match[2]);

  if (!Number.isInteger(h) || !Number.isInteger(m)) return "";
  if (h < 0 || h > 23) return "";
  if (m < 0 || m > 59) return "";

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function horaAMinutos(hora) {
  const normalizada = normalizarHora(hora);

  if (!normalizada) return null;

  const [h, m] = normalizada.split(":").map(Number);
  return h * 60 + m;
}

export function minutosAHora(minutos) {
  const total = ((Number(minutos || 0) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function compararHoras(horaA, horaB) {
  const a = horaAMinutos(horaA);
  const b = horaAMinutos(horaB);

  if (a === null || b === null) return 0;

  return a - b;
}

export function rangoCruzaMedianoche(horaInicio, horaFin) {
  const inicio = horaAMinutos(horaInicio);
  const fin = horaAMinutos(horaFin);

  if (inicio === null || fin === null) return false;

  return fin <= inicio;
}

export function duracionRangoMinutos(horaInicio, horaFin) {
  const inicio = horaAMinutos(horaInicio);
  const fin = horaAMinutos(horaFin);

  if (inicio === null || fin === null) return 0;

  if (fin >= inicio) {
    return fin - inicio;
  }

  return 1440 - inicio + fin;
}
