const CACHE_VERSION = "informes-gp-v20260805-informes-ui-modelos-5";
const CACHE_ESTATICO = `${CACHE_VERSION}-static`;

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./frontend/app/app-bundle.css",
  "./frontend/assets/logo-bmzcn-gold-black.png",
  "./frontend/assets/icon-192.png",
  "./frontend/assets/icon-512.png",
  "./frontend/app/app-bootstrap.js?v=20260805-informes-ui-modelos-5",
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
  "./backend/infraestructura/supabase/supabase-rest-rapido.js",
  "./frontend/pantallas/inicia/inicia.html",
  "./frontend/pantallas/inicia/inicia.js",
  "./frontend/pantallas/inicia/compartido/inicio-builder.js",
  "./frontend/pantallas/inicia/componentes/personal-policial/personal-policial.js",
  "./frontend/pantallas/inicia/componentes/movilidad/movilidad.js",
  "./frontend/pantallas/inicia/componentes/elementos/elementos.js",
  "./frontend/pantallas/inicia/componentes/observaciones/observaciones.js",
  "./frontend/pantallas/inicia/componentes/agregar-elementos-presencia-activa/agregar-elementos-presencia-activa.js",
  "./frontend/pantallas/inicia/componentes/fotos-inicio/fotos-inicio.html",
  "./frontend/pantallas/inicia/componentes/fotos-inicio/fotos-inicio.js",
  "./frontend/servicios/fotos/fotos-formulario-loader.js",
  "./frontend/servicios/fotos/comprimir-foto.js",
  "./backend/dominio/inicia/recursos-inicio.js",
  "./backend/dominio/compartido/recursos/catalogo-recursos-operativos.js",
  "./frontend/compatibilidad/control-moviles/wsp-control-moviles-flujo-ui.js?v=20260805-informes-ui-modelos-5",
  "./frontend/compatibilidad/control-moviles/wsp-control-moviles-ui.js?v=20260805-informes-ui-modelos-5",
  "./frontend/compatibilidad/control-moviles/control-moviles.js?v=20260805-informes-ui-modelos-5",
  "./frontend/compatibilidad/pantalla-principal/pantalla-principal-flujo.js?v=20260805-informes-ui-modelos-5",
  "./backend/aplicacion/estado/fotos-estado.js",
  "./backend/dominio/compartido/tipos/operativos-elementos-controlados-opcionales.js",
  "./backend/dominio/compartido/tipos/presencia-activa-puente.js",
  "./backend/dominio/compartido/tipos/resultados-especiales-finaliza.js",
  "./backend/dominio/inicia/inicio-mapper-supabase.js",
  "./backend/dominio/inicia/inicio-salida-texto-base.js",
  "./backend/dominio/inicia/inicio-validaciones-base.js",
  "./backend/dominio/whatsapp/formateador-control-moviles.js",
  "./backend/dominio/whatsapp/formateador-finalizado.js",
  "./backend/dominio/whatsapp/formateador-informes.js",
  "./backend/dominio/whatsapp/formateador-inicio.js",
  "./backend/dominio/whatsapp/fotos-whatsapp.js",
  "./backend/dominio/whatsapp/whatsapp-config.js",
  "./backend/infraestructura/ensayo/operativos-ensayo.js",
  "./frontend/pantallas/informes/modelos-informes.js",
  "./frontend/pantallas/informes/informes.js",
  "./frontend/pantallas/informes/compartido/informe-especial-builder.js",
  "./frontend/pantallas/informes/modelos/control-armas/control-armas.html",
  "./frontend/pantallas/informes/modelos/control-armas/control-armas.js",
  "./frontend/pantallas/informes/modelos/retencion-licencia/retencion-licencia.html",
  "./frontend/pantallas/informes/modelos/retencion-licencia/retencion-licencia.js",
  "./frontend/servicios/whatsapp/abrir-whatsapp.js",
  "./frontend/servicios/whatsapp/salida-whatsapp.js"
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
      .then(() => recargarClientesConVersionActual())
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

  // JS/HTML deben pasar por la red (usando el cache HTTP normal del navegador)
  // para que una publicación nueva de GitHub no ejecute código viejo del SW.
  if (/\.(?:js|html)$/i.test(url.pathname)) return;

  if (esRecursoEstatico(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});


async function recargarClientesConVersionActual() {
  const clientes = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const version = "20260805-informes-ui-modelos-5";

  await Promise.all(clientes.map(async (cliente) => {
    try {
      const url = new URL(cliente.url);
      if (url.searchParams.get("igp_v") === version) return;
      url.searchParams.set("igp_v", version);
      await cliente.navigate(url.href);
    } catch {}
  }));
}

async function navigationNetworkFirst(request) {
  const cache = await caches.open(CACHE_ESTATICO);

  try {
    const response = await fetch(request);
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

  const response = await fetch(request);
  if (response?.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

function esRecursoEstatico(pathname) {
  return /\.(?:js|css|html|png|jpg|jpeg|webp|svg|json|webmanifest)$/i.test(pathname);
}
