import { cargarComponenteHtml } from "../ui/cargar-componente-html.js";

export async function cargarFotosDeFormulario({
  form,
  contexto = {}
} = {}) {
  if (!form) return [];

  const hosts = form.querySelectorAll("[data-fotos-html][data-fotos-module]");
  const cargadas = [];

  for (const host of hosts) {
    const html = host.dataset.fotosHtml;
    const moduloPath = host.dataset.fotosModule;

    if (!html || !moduloPath) continue;

    host.innerHTML = await cargarComponenteHtml(html);

    const modulo = await import(moduloPath);

    if (typeof modulo.iniciarModuloFotos === "function") {
      const estado = await modulo.iniciarModuloFotos({
        root: host,
        contexto
      });

      cargadas.push(estado);
    }
  }

  return cargadas;
}