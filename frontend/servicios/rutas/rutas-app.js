/**
 * Resuelve únicamente rutas absolutas internas de Informes_GP contra la raíz
 * real desde la que se abrió index.html. Esto permite que la misma aplicación
 * funcione en localhost y dentro de una subcarpeta de GitHub Pages.
 */
export function resolverRutaApp(ruta) {
  const valor = String(ruta || "").trim();
  if (!valor) return valor;

  if (!/^\/(frontend|backend)\//i.test(valor)) {
    return valor;
  }

  const base = obtenerBaseApp();
  return new URL(valor.replace(/^\/+/, ""), base).href;
}

export function normalizarRutasHtmlApp(html) {
  const texto = String(html ?? "");
  if (!texto) return texto;

  const base = obtenerBaseApp().href;

  return texto.replace(
    /(["'])\/(frontend|backend)\//gi,
    (_match, comilla, carpeta) => `${comilla}${base}${carpeta}/`
  );
}

export function obtenerBaseApp() {
  return new URL("./", document.baseURI || window.location.href);
}
