export function renderElementos({
  host,
  grupos = [],
  seleccionInicial = {},
  onChange
} = {}) {
  if (!host) return;

  host.innerHTML = `
    <div class="inicio-elementos-lista">
      ${grupos.map((grupo) => crearGrupoElementos(grupo, seleccionInicial?.[grupo.clave] || [])).join("")}
    </div>
  `;

  host.addEventListener("change", () => {
    if (typeof onChange === "function") {
      onChange(obtenerElementosSeleccionados(host));
    }
  });
}

export function obtenerElementosSeleccionados(root = document) {
  const resultado = {};

  for (const input of root.querySelectorAll('[data-inicio-elemento]:checked')) {
    const grupo = String(input.dataset.inicioElemento || "").trim();
    if (!grupo) continue;

    resultado[grupo] = resultado[grupo] || [];
    resultado[grupo].push(String(input.value || "").trim());
  }

  return resultado;
}

function crearGrupoElementos(grupo = {}, seleccionInicial = []) {
  const seleccionados = new Set(normalizarLista(seleccionInicial));
  const cantidad = Math.max(1, Math.min(4, Number(grupo.items?.length || 1)));

  return `
    <section class="inicio-seccion inicio-elemento-grupo" data-elemento-grupo="${escapeAttr(grupo.clave)}">
      <h2 class="inicio-seccion-titulo">${escapeHtml(grupo.etiqueta)}</h2>
      <div class="inicio-opciones-grid inicio-elementos-grid inicio-elementos-grid--${cantidad}">
        ${(grupo.items || []).map((item, indice) => crearOpcionElemento({ grupo: grupo.clave, item, indice, checked: seleccionados.has(item) })).join("")}
      </div>
    </section>
  `;
}

function crearOpcionElemento({ grupo, item, indice, checked }) {
  const id = `inicio-elemento-${grupo}-${indice + 1}`;

  return `
    <label class="inicio-opcion inicio-opcion-recurso inicio-opcion-elemento" for="${escapeAttr(id)}">
      <span>${escapeHtml(item)}</span>
      <input
        id="${escapeAttr(id)}"
        type="checkbox"
        value="${escapeAttr(item)}"
        data-inicio-elemento="${escapeAttr(grupo)}"
        ${checked ? "checked" : ""}
      >
    </label>
  `;
}

function normalizarLista(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function escapeHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(valor) {
  return escapeHtml(valor);
}
