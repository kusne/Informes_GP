export function renderMovilidadFinaliza({ host, moviles = [], motos = [], seleccionInicial = {}, onChange } = {}) {
  if (!host) return;
  host.innerHTML = `
    <section class="finaliza-recurso-seccion finaliza-movilidad" aria-labelledby="finalizaMovilidadTitulo">
      <h2 id="finalizaMovilidadTitulo" class="finaliza-seccion-titulo">Móviles:</h2>
      <div class="finaliza-opciones-grid finaliza-moviles-grid">
        ${moviles.map((numero, indice) => crearOpcion("movil", numero, indice)).join("")}
      </div>
      <h3 class="finaliza-subtitulo">Motos:</h3>
      <div class="finaliza-opciones-grid finaliza-motos-grid">
        ${motos.map((numero, indice) => crearOpcion("moto", numero, indice)).join("")}
      </div>
    </section>
  `;
  aplicarMovilidadFinaliza(host, seleccionInicial);
  host.addEventListener("change", () => onChange?.(obtenerMovilidadFinaliza(host)));
}

export function obtenerMovilidadFinaliza(root = document) {
  return {
    moviles: [...root.querySelectorAll('[data-finaliza-movil]:checked')].map((i) => String(i.value || "").trim()).filter(Boolean),
    motos: [...root.querySelectorAll('[data-finaliza-moto]:checked')].map((i) => String(i.value || "").trim()).filter(Boolean)
  };
}

export function aplicarMovilidadFinaliza(root = document, seleccionInicial = {}) {
  const moviles = new Set(normalizarLista(seleccionInicial?.moviles));
  const motos = new Set(normalizarLista(seleccionInicial?.motos));
  root.querySelectorAll('[data-finaliza-movil]').forEach((input) => { input.checked = moviles.has(clave(input.value)); });
  root.querySelectorAll('[data-finaliza-moto]').forEach((input) => { input.checked = motos.has(clave(input.value)); });
}

export function limpiarMovilidadFinaliza(root = document) {
  root.querySelectorAll('[data-finaliza-movil], [data-finaliza-moto]').forEach((input) => { input.checked = false; });
}

function crearOpcion(tipo, numero, indice) {
  const id = `finaliza-${tipo}-${indice + 1}`;
  const atributo = tipo === "movil" ? "data-finaliza-movil" : "data-finaliza-moto";
  return `
    <label class="finaliza-opcion finaliza-opcion-recurso" for="${id}">
      <span>${escapeHtml(numero)}</span>
      <input id="${id}" type="checkbox" value="${escapeAttr(numero)}" ${atributo}>
    </label>
  `;
}
function normalizarLista(valores) { return (Array.isArray(valores) ? valores : []).map(clave).filter(Boolean); }
function clave(valor) { return String(valor || "").trim().toLowerCase(); }
function escapeHtml(valor) { return String(valor || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function escapeAttr(valor) { return escapeHtml(valor); }
