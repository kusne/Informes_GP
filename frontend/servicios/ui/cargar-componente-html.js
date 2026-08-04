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
    return await cacheHtml.get(rutaResuelta);
  }

  // Se cachea también la promesa para que dos módulos que pidan el mismo
  // fragmento al mismo tiempo compartan una sola descarga.
  const carga = fetch(rutaResuelta, {
    cache: "default"
  }).then(async (respuesta) => {
    if (!respuesta.ok) {
      throw new Error(`No se pudo cargar componente HTML: ${path}`);
    }

    return normalizarRutasHtmlApp(await respuesta.text());
  });

  cacheHtml.set(rutaResuelta, carga);

  try {
    const html = await carga;
    cacheHtml.set(rutaResuelta, html);
    return html;
  } catch (error) {
    cacheHtml.delete(rutaResuelta);
    throw error;
  }
}

export function limpiarCacheComponentesHtml() {
  cacheHtml.clear();
}
