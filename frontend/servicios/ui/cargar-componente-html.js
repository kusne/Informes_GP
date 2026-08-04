import {
  resolverRutaApp,
  normalizarRutasHtmlApp
} from "../rutas/rutas-app.js";

const cacheHtml = new Map();

export async function cargarComponenteHtml(ruta) {
  const path = String(ruta || "").trim();

  if (!path) {
    throw new Error("Ruta HTML vacía.");
  }

  const rutaResuelta = resolverRutaApp(path);

  if (cacheHtml.has(rutaResuelta)) {
    return cacheHtml.get(rutaResuelta);
  }

  const respuesta = await fetch(rutaResuelta, {
    cache: "no-store"
  });

  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar componente HTML: ${path}`);
  }

  const html = normalizarRutasHtmlApp(await respuesta.text());
  cacheHtml.set(rutaResuelta, html);

  return html;
}

export function limpiarCacheComponentesHtml() {
  cacheHtml.clear();
}
