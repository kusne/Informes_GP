const CACHE_VERSION = "informes-gp-v20260803-opt4";
const CACHE_ESTATICO = `${CACHE_VERSION}-static`;

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./frontend/app/app-bundle.css",
  "./frontend/assets/logo-bmzcn-gold-black.png",
  "./frontend/assets/icon-192.png",
  "./frontend/assets/icon-512.png",
  "./frontend/app/app-bootstrap.js?v=20260803-opt4",
  "./frontend/app/app.js",
  "./frontend/servicios/navegacion/instancia-unica.js",
  "./frontend/servicios/ui/cargar-componente-html.js",
  "./frontend/servicios/rutas/rutas-app.js",
  "./frontend/pantallas/pantalla-principal/pantalla-principal.js",
  "./frontend/pantallas/pantalla-principal/componentes/aviso-modo-ensayo/aviso-modo-ensayo.js",
  "./frontend/pantallas/pantalla-principal/componentes/selector-modo-informe/selector-modo-informe.js",
  "./frontend/pantallas/pantalla-principal/componentes/contador-operativos/contador-operativos.js",
  "./frontend/pantallas/pantalla-principal/componentes/selector-operativo-contextual/selector-operativo-contextual.js",
  "./frontend/pantallas/pantalla-principal/componentes/contenedor-dinamico/contenedor-dinamico.js",
  "./backend/dominio/compartido/fechas/guardia-0600.js",
  "./backend/aplicacion/operativos/operativos-contexto.js",
  "./backend/aplicacion/operativos/operativos.js",
  "./backend/aplicacion/operativos/operativos-cache.js",
  "./backend/aplicacion/estado/informes-coordinador.js",
  "./backend/aplicacion/estado/informes-state.js",
  "./backend/infraestructura/ensayo/modo-ensayo.js",
  "./backend/infraestructura/supabase/supabase-client.js",
  "./backend/infraestructura/supabase/operativos-programados-v2-repo.js",
  "./backend/infraestructura/supabase/operativos-programados-v2-mapper.js",
  "./backend/infraestructura/supabase/supabase-operativos-programados-client.js",
  "./backend/infraestructura/supabase/operativos-estado-v2-repo.js",
  "./frontend/compatibilidad/control-moviles/wsp-control-moviles-flujo-ui.js?v=20260803-opt4",
  "./frontend/compatibilidad/control-moviles/wsp-control-moviles-ui.js?v=20260803-opt4",
  "./frontend/compatibilidad/control-moviles/control-moviles.js?v=20260803-opt4",
  "./frontend/compatibilidad/pantalla-principal/pantalla-principal-flujo.js?v=20260803-opt4"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_ESTATICO)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("informes-gp-") && key !== CACHE_ESTATICO)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (esRecursoEstatico(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_ESTATICO);
  try {
    const response = await fetch(request);
    if (response?.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match("./index.html"));
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_ESTATICO);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response?.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

function esRecursoEstatico(pathname) {
  return /\.(?:js|css|html|png|jpg|jpeg|webp|svg|json|webmanifest)$/i.test(pathname);
}
