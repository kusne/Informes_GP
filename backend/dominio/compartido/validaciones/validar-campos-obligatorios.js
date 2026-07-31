export function validarCamposObligatorios(objeto = {}, campos = []) {
  const errores = [];

  for (const campo of campos) {
    const valor = objeto[campo];

    if (!tieneContenido(valor)) {
      errores.push(`Falta completar: ${campo}`);
    }
  }

  return errores;
}

export function tieneContenido(valor) {
  if (valor === null || valor === undefined) return false;
  if (typeof valor === "string") return valor.trim().length > 0;
  if (Array.isArray(valor)) return valor.length > 0;

  return true;
}
