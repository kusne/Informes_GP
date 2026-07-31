export function validarInicioBase(inicio) {
  const errores = [];

  if (!inicio?.operativo_key) {
    errores.push("Debe seleccionar un operativo programado.");
  }

  if (!inicio?.guardia_fecha) {
    errores.push("No se pudo resolver la guardia_fecha.");
  }

  if (!inicio?.lugar) {
    errores.push("El operativo seleccionado no tiene lugar.");
  }

  if (!inicio?.hora_inicio || !inicio?.hora_fin) {
    errores.push("El operativo seleccionado no tiene horario completo.");
  }

  const f = inicio?.formulario || {};

  if (!texto(f.personal)) {
    errores.push("Debe completar Personal.");
  }

  if (!texto(f.moviles_motos)) {
    errores.push("Debe completar Móviles / motos.");
  }

  return errores;
}

function texto(valor) {
  return String(valor || "").trim();
}