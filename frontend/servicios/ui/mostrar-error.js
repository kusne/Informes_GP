export function mostrarError(mensaje, error = null) {
  const texto = normalizarMensaje(mensaje, error);

  console.error("[Informes_GP]", texto, error || "");
  alert(texto);
}

export function normalizarMensaje(mensaje, error = null) {
  const partes = [];

  if (mensaje) partes.push(String(mensaje));

  if (error?.mensaje) partes.push(String(error.mensaje));
  else if (error?.message) partes.push(String(error.message));

  return partes.filter(Boolean).join("\n") || "Ocurrió un error.";
}
