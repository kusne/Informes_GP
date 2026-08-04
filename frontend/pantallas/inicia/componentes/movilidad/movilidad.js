export function renderMovilidad({
  host,
  moviles = [],
  motos = [],
  seleccionInicial = {},
  onChange
} = {}) {
  if (!host) return;

  const movilesSeleccionados = new Set(normalizarLista(seleccionInicial.moviles));
  const motosSeleccionadas = new Set(normalizarLista(seleccionInicial.motos));

  host.innerHTML = `
    <section class="inicio-seccion inicio-movilidad" aria-labelledby="inicioMovilidadTitulo">
      <h2 id="inicioMovilidadTitulo" class="inicio-seccion-titulo">Móviles:</h2>
      <div class="inicio-opciones-grid inicio-moviles-grid">
        ${moviles.map((numero, indice) => crearOpcionMovilidad({ tipo: "movil", numero, indice, checked: movilesSeleccionados.has(numero) })).join("")}
      </div>

      <h3 class="inicio-subtitulo">Motos:</h3>
      <div class="inicio-opciones-grid inicio-motos-grid">
        ${motos.map((numero, indice) => crearOpcionMovilidad({ tipo: "moto", numero, indice, checked: motosSeleccionadas.has(numero) })).join("")}
      </div>
    </section>
  `;

  host.addEventListener("change", () => {
    if (typeof onChange === "function") {
      onChange(obtenerMovilidadSeleccionada(host));
    }
  });
}

export function obtenerMovilidadSeleccionada(root = document) {
  return {
    moviles: [...root.querySelectorAll('[data-inicio-movil]:checked')]
      .map((input) => String(input.value || "").trim())
      .filter(Boolean),
    motos: [...root.querySelectorAll('[data-inicio-moto]:checked')]
      .map((input) => String(input.value || "").trim())
      .filter(Boolean)
  };
}

function crearOpcionMovilidad({ tipo, numero, indice, checked }) {
  const id = `inicio-${tipo}-${indice + 1}`;
  const atributo = tipo === "movil" ? "data-inicio-movil" : "data-inicio-moto";

  return `
    <label class="inicio-opcion inicio-opcion-recurso" for="${id}">
      <span>${escapeHtml(numero)}</span>
      <input
        id="${id}"
        type="checkbox"
        value="${escapeAttr(numero)}"
        ${atributo}
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
