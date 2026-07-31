export function validarFinalizadoBase(finalizado) {
  const errores = [];

  if (!finalizado?.operativo_key) {
    errores.push("Debe seleccionar un operativo iniciado.");
  }

  if (!finalizado?.guardia_fecha) {
    errores.push("No se pudo resolver la guardia_fecha.");
  }

  if (!finalizado?.lugar) {
    errores.push("El operativo seleccionado no tiene lugar.");
  }

  if (!finalizado?.hora_inicio || !finalizado?.hora_fin) {
    errores.push("El operativo seleccionado no tiene horario completo.");
  }

  const f = finalizado?.formulario || {};

  for (const campo of ["actas", "personas", "vehiculos"]) {
    const valor = Number(f[campo] || 0);

    if (!Number.isFinite(valor) || valor < 0) {
      errores.push(`El campo ${campo} debe ser un número válido.`);
    }
  }

  return errores;
}