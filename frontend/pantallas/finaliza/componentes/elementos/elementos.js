export function renderElementosFinaliza({ host, grupos = [], seleccionInicial = {}, onChange } = {}) {
  if (!host) return;
  host.innerHTML = `<div class="finaliza-elementos-lista">${grupos.map(crearGrupo).join("")}</div>`;
  aplicarElementosFinaliza(host, seleccionInicial);
  host.addEventListener("change", () => onChange?.(obtenerElementosFinaliza(host)));
}

export function obtenerElementosFinaliza(root = document) {
  const resultado = {};
  for (const input of root.querySelectorAll('[data-finaliza-elemento]:checked')) {
    const grupo = String(input.dataset.finalizaElemento || "").trim();
    if (!grupo) continue;
    resultado[grupo] = resultado[grupo] || [];
    resultado[grupo].push(String(input.value || "").trim());
  }
  return resultado;
}

export function aplicarElementosFinaliza(root = document, seleccionInicial = {}) {
  root.querySelectorAll('[data-finaliza-elemento]').forEach((input) => {
    const grupo = String(input.dataset.finalizaElemento || "").trim();
    const wanted = new Set((Array.isArray(seleccionInicial?.[grupo]) ? seleccionInicial[grupo] : []).map(clave));
    input.checked = wanted.has(clave(input.value));
  });
}

export function limpiarElementosFinaliza(root = document) {
  root.querySelectorAll('[data-finaliza-elemento]').forEach((input) => { input.checked = false; });
}

function crearGrupo(grupo = {}) {
  const cantidad = Math.max(1, Math.min(4, Number(grupo.items?.length || 1)));
  return `
    <section class="finaliza-recurso-seccion finaliza-elemento-grupo" data-elemento-grupo="${escapeAttr(grupo.clave)}">
      <h2 class="finaliza-seccion-titulo">${escapeHtml(grupo.etiqueta)}</h2>
      <div class="finaliza-opciones-grid finaliza-elementos-grid finaliza-elementos-grid--${cantidad}">
        ${(grupo.items || []).map((item, indice) => crearOpcion(grupo.clave, item, indice)).join("")}
      </div>
    </section>
  `;
}
function crearOpcion(grupo, item, indice) {
  const id = `finaliza-elemento-${grupo}-${indice + 1}`;
  return `
    <label class="finaliza-opcion finaliza-opcion-recurso finaliza-opcion-elemento" for="${escapeAttr(id)}">
      <span>${escapeHtml(item)}</span>
      <input id="${escapeAttr(id)}" type="checkbox" value="${escapeAttr(item)}" data-finaliza-elemento="${escapeAttr(grupo)}">
    </label>
  `;
}
function clave(valor) { return String(valor || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function escapeHtml(valor) { return String(valor || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function escapeAttr(valor) { return escapeHtml(valor); }
