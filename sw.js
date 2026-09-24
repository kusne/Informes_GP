// Informes GP funciona online: los informes nunca se ejecutan desde código
// obsoleto de Cache Storage cuando no se puede verificar la versión.
const PARAMS = new URL(self.location.href).searchParams;
const VERSION = PARAMS.get("v") || "";
const CACHE_ICONOS = `igp-iconos-${VERSION}`;
const ICONOS = [
  "./frontend/assets/logo-bmzcn-gold-black.png",
  "./frontend/assets/icon-192.png",
  "./frontend/assets/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_ICONOS)
      .then((cache) => cache.addAll(ICONOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Limpiar también los cachés de JS/HTML creados por versiones anteriores.
    const claves = await caches.keys();
    await Promise.all(
      claves.filter((key) =>
        (key.startsWith("informes-gp-") || key.startsWith("igp-iconos-")) &&
        key !== CACHE_ICONOS
      ).map((key) => caches.delete(key))
    );
    await self.clients.claim();
    // Una PWA que permaneció abierta recibe la nueva versión al activarse SW.
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const ventana of ventanas) {
      ventana.postMessage({ tipo: "IGP_SW_ACTIVADO", version: VERSION });
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // La única cache que se permite para la PWA es la de los iconos. NO servir
  // index, fragmentos HTML, CSS, JS, JSON o manifest desde Cache Storage.
  if (request.mode === "navigate" || /\.(?:js|css|html|json|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(descargarVersionVigente(request));
    return;
  }

  if (/\.(?:png|jpg|jpeg|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(descargarImagen(request));
  }
});

async function descargarVersionVigente(request) {
  try {
    const response = await fetch(new Request(request, { cache: "no-store" }));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch {
    return new Response(
      "No se pudo verificar la versión vigente de Informes GP. Conéctese a Internet y vuelva a ingresar.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }
}

async function descargarImagen(request) {
  try {
    const response = await fetch(new Request(request, { cache: "no-store" }));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch {
    // Solo se permiten los iconos de instalación existentes en el precaché.
    const url = new URL(request.url);
    const path = url.pathname;
    if (ICONOS.some((icono) => new URL(icono, self.location.href).pathname === path)) {
      const cache = await caches.open(CACHE_ICONOS);
      const icono = ICONOS.find((item) => new URL(item, self.location.href).pathname === path);
      return (await cache.match(icono)) || new Response("", { status: 503 });
    }
    return new Response("", { status: 503 });
  }
}
