const CACHE_VERSION = "informes-gp-v20260829-legibilidad-recursos-v1";
const CACHE_ESTATICO = `${CACHE_VERSION}-static`;

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./frontend/app/app-bundle.css",
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
      // La actualización del Service Worker NO navega ni recarga ventanas
      // abiertas. El usuario puede terminar el formulario que está usando.
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

  // JS/HTML siempre por red y sin cache HTTP: evita que GitHub/PWA ejecute
  // una versión anterior después de publicar una corrección de interfaz.
  if (/\.(?:js|html)$/i.test(url.pathname)) {
    event.respondWith(fetch(request, { cache: "no-store" }));
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

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_ESTATICO);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request, { cache: "no-store" });
  if (response?.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

function esRecursoEstatico(pathname) {
  return /\.(?:js|css|html|png|jpg|jpeg|webp|svg|json|webmanifest)$/i.test(pathname);
}
