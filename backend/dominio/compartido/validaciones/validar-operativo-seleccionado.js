export function validarOperativoSeleccionado(operativoSeleccionado) {
  const errores = [];

  if (!operativoSeleccionado) {
    errores.push("Debe seleccionar un operativo.");
    return errores;
  }

  if (!operativoSeleccionado.operativo_key) {
    errores.push("El operativo seleccionado no tiene clave válida.");
  }

  return errores;
}

export function operativoSeleccionadoEsValido(operativoSeleccionado) {
  return validarOperativoSeleccionado(operativoSeleccionado).length === 0;
}
