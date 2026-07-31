export function validarRecursosInicio({ personal, moviles_motos, moviles, elementos } = {}) {
  const errores = [];

  if (!textoConContenido(personal)) {
    errores.push("Debe cargar personal afectado.");
  }

  if (!textoConContenido(moviles_motos) && !textoConContenido(moviles)) {
    errores.push("Debe cargar móviles, motos o recursos afectados.");
  }

  return errores;
}

export function textoConContenido(valor) {
  return String(valor || "").trim().length > 0;
}
