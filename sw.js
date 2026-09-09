const CACHE_VERSION = "informes-gp-v20260909-actualizacion-inmediata-v1";
const CACHE_ESTATICO = `${CACHE_VERSION}-static`;

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./frontend/assets/logo-bmzcn-gold-black.png",
  "./frontend/assets/icon-192.png",
  "./frontend/assets/icon-512.png"
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
    event.respondWith(navigationNetworkFirst(request));
    return;
  }

  // Todo lo que pueda cambiar con una publicación se consulta primero en red.
  // La caché queda únicamente como respaldo sin conexión.
  if (esRecursoActualizable(url.pathname)) {
    event.respondWith(recursoNetworkFirst(request));
    return;
  }

  if (esRecursoEstatico(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

async function navigationNetworkFirst(request) {
  const cache = await caches.open(CACHE_ESTATICO);

  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response?.ok) {
      await cache.put("./index.html", response.clone());
    }
    return response;
  } catch {
    const cached = (await cache.match(request)) || (await cache.match("./index.html"));
    if (cached) return cached;
    return new Response("Sin conexión", { status: 503 });
  }
}

async function recursoNetworkFirst(request) {
  const cache = await caches.open(CACHE_ESTATICO);

  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response?.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error(`Recurso no disponible: ${request.url}`);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_ESTATICO);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request, { cache: "no-store" });
  if (response?.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

function esRecursoActualizable(pathname) {
  return /\.(?:js|css|html|json|webmanifest)$/i.test(pathname);
}

function esRecursoEstatico(pathname) {
  return /\.(?:png|jpg|jpeg|webp|svg|ico)$/i.test(pathname);
}
