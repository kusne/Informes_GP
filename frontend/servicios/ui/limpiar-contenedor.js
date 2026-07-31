export function limpiarContenedor(selectorOElemento) {
  const elemento = typeof selectorOElemento === "string"
    ? document.querySelector(selectorOElemento)
    : selectorOElemento;

  if (!elemento) return false;

  elemento.innerHTML = "";
  return true;
}
