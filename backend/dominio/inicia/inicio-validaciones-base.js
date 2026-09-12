export function validarInicioBase(inicio) {
  const errores = [];

  if (!inicio?.operativo_key) errores.push("Debe seleccionar un operativo programado.");
  if (!inicio?.guardia_fecha) errores.push("No se pudo resolver la guardia_fecha.");
  if (!inicio?.lugar) errores.push("El operativo seleccionado no tiene lugar.");
  if (!inicio?.hora_inicio || !inicio?.hora_fin) errores.push("El operativo seleccionado no tiene horario completo.");

  const f = inicio?.formulario || {};

  if (!texto(f.personal)) errores.push("Debe completar Personal.");
  if (!texto(f.moviles_motos)) errores.push("Debe completar Móviles / motos.");

  validarPresenciaActiva(errores, f);
  return errores;
}

function validarPresenciaActiva(errores, f = {}) {
  if (!f.presencia_activa) return;
  const motivo = texto(f.presencia_activa_motivo).toUpperCase();
  if (!["LLUVIA", "OTROS"].includes(motivo)) {
    errores.push("Seleccione el motivo de Presencia activa: Lluvia u Otros.");
  }
  if (motivo === "OTROS" && !texto(f.presencia_activa_otro)) {
    errores.push("Escriba el motivo de Presencia activa en Otros.");
  }
}

function texto(valor) {
  return String(valor || "").trim();
}