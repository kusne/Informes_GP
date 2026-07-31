const cacheHtml = new Map();

export async function cargarComponenteHtml(ruta) {
  const path = String(ruta || "").trim();

  if (!path) {
    throw new Error("Ruta HTML vacía.");
  }

  if (cacheHtml.has(path)) {
    return cacheHtml.get(path);
  }

  const respuesta = await fetch(path, {
    cache: "no-store"
  });

  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar componente HTML: ${path}`);
  }

  const html = await respuesta.text();
  cacheHtml.set(path, html);

  return html;
}

export function limpiarCacheComponentesHtml() {
  cacheHtml.clear();
}
