export function renderPersonalPolicial({
  host,
  personal = [],
  seleccionInicial = [],
  onChange
} = {}) {
  if (!host) return;

  const seleccion = new Set(normalizarLista(seleccionInicial));

  host.innerHTML = `
    <section class="inicio-seccion inicio-personal" aria-labelledby="inicioPersonalTitulo">
      <h2 id="inicioPersonalTitulo" class="inicio-seccion-titulo">Personal Policial</h2>
      <div class="inicio-personal-lista">
        ${personal.map((nombre, indice) => crearItemPersonal(nombre, indice, seleccion.has(nombre))).join("")}
      </div>
    </section>
  `;

  host.addEventListener("change", () => {
    if (typeof onChange === "function") {
      onChange(obtenerPersonalSeleccionado(host));
    }
  });
}

export function obtenerPersonalSeleccionado(root = document) {
  return [...root.querySelectorAll('[data-inicio-personal]:checked')]
    .map((input) => String(input.value || "").trim())
    .filter(Boolean);
}

function crearItemPersonal(nombre, indice, checked) {
  const id = `inicio-personal-${indice + 1}`;

  return `
    <label class="inicio-opcion inicio-opcion-personal" for="${id}">
      <span>${escapeHtml(nombre)}</span>
      <input
        id="${id}"
        type="checkbox"
        value="${escapeAttr(nombre)}"
        data-inicio-personal
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
