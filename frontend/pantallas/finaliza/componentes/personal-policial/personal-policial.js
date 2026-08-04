export function renderPersonalFinaliza({ host, personal = [], seleccionInicial = [], onChange } = {}) {
  if (!host) return;
  host.innerHTML = `
    <section class="finaliza-recurso-seccion finaliza-personal" aria-labelledby="finalizaPersonalTitulo">
      <h2 id="finalizaPersonalTitulo" class="finaliza-seccion-titulo">Personal Policial</h2>
      <div class="finaliza-personal-lista">
        ${personal.map((nombre, indice) => crearItem(nombre, indice)).join("")}
      </div>
    </section>
  `;
  aplicarPersonalFinaliza(host, seleccionInicial);
  host.addEventListener("change", () => onChange?.(obtenerPersonalFinaliza(host)));
}

export function obtenerPersonalFinaliza(root = document) {
  return [...root.querySelectorAll('[data-finaliza-personal]:checked')]
    .map((input) => String(input.value || "").trim())
    .filter(Boolean);
}

export function aplicarPersonalFinaliza(root = document, seleccionados = []) {
  const wanted = new Set(normalizarLista(seleccionados));
  root.querySelectorAll('[data-finaliza-personal]').forEach((input) => {
    input.checked = wanted.has(clave(input.value));
  });
}

export function limpiarPersonalFinaliza(root = document) {
  root.querySelectorAll('[data-finaliza-personal]').forEach((input) => { input.checked = false; });
}

function crearItem(nombre, indice) {
  const id = `finaliza-personal-${indice + 1}`;
  return `
    <label class="finaliza-opcion finaliza-opcion-personal" for="${id}">
      <span>${escapeHtml(nombre)}</span>
      <input id="${id}" type="checkbox" value="${escapeAttr(nombre)}" data-finaliza-personal>
    </label>
  `;
}

function normalizarLista(valores) {
  return new Set((Array.isArray(valores) ? valores : []).map(clave).filter(Boolean));
}
function clave(valor) {
  return String(valor || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
}
function escapeHtml(valor) {
  return String(valor || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function escapeAttr(valor) { return escapeHtml(valor); }
