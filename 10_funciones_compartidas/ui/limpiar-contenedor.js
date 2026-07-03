export function limpiarContenedor(selector) {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = "";
}
