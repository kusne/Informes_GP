const MOVILES_BASE = ["12428", "12502"];
const MOTOS_BASE = [
  { numero: "12087", cc: "250cc." },
  { numero: "12088", cc: "250cc." },
  { numero: "12089", cc: "250cc." },
  { numero: "12090", cc: "250cc." },
  { numero: "12091", cc: "250cc." },
  { numero: "8989", cc: "300cc." },
  { numero: "9029", cc: "300cc." },
  { numero: "9030", cc: "300cc." },
  { numero: "9071", cc: "300cc." },
  { numero: "9087", cc: "650cc." },
  { numero: "9088", cc: "650cc." },
  { numero: "9091", cc: "650cc." },
  { numero: "9092", cc: "650cc." },
];

let refs = null;
let movilSeleccionado = null;
let inicializado = false;

function q(root, selector) {
  return root ? root.querySelector(selector) : document.querySelector(selector);
}

function byId(id) {
  return document.getElementById(id);
}

function getRoot(contexto = {}) {
  if (contexto instanceof HTMLElement) return contexto;
  if (contexto?.root instanceof HTMLElement) return contexto.root;
  if (contexto?.contenedor instanceof HTMLElement) return contexto.contenedor;
  if (contexto?.container instanceof HTMLElement) return contexto.container;

  return (
    byId("controlMovilesRoot") ||
    document.querySelector("[data-control-moviles-root]") ||
    document.querySelector("#moduloDinamico") ||
    document.querySelector("#contenedorDinamico") ||
    document.body
  );
}

function templateHtml() {
  return `
    <section id="controlMovilesRoot" class="cmv-root" data-control-moviles-root>
      <header class="cmv-header">
        <div>
          <h2 class="cmv-title">Control de móviles</h2>
          <p id="controlMovilesEstado" class="cmv-estado">Seleccione un móvil en servicio.</p>
        </div>
        <label class="cmv-fuera-servicio">
          <input id="controlMovilFueraServicio" type="checkbox" />
          <span>Fuera de Servicio</span>
        </label>
      </header>

      <div id="controlMovilesAyudaWrap" class="cmv-ayuda-wrap">
        <button id="controlMovilesAyudaBtn" class="cmv-ayuda-btn" type="button" aria-expanded="false" aria-controls="controlMovilesAyudaPopup">?</button>
        <div id="controlMovilesAyudaPopup" class="cmv-ayuda-popup hidden" role="dialog" aria-label="Ayuda control de móviles">
          <strong>Que Controlar? Sistemas Pasivos y Activos</strong>
          <p><b>Anotar:</b> kilometraje y Combustible</p>
          <p><b>Revisar:</b> Luces Altas/Bajas/de giro/balizas y Sirena; Batería, Cubiertas y Nivel Aceite, Gato, Matafuego.</p>
          <p><b>Ejemplo de Novedad:</b> matafuego vencido--cubierta lisa--sin batería--luz quemada</p>
          <p>Anotar en Observaciones las novedades; adjuntar fotos/video y apretar guardar.</p>
        </div>
      </div>

      <div id="controlMovilesListado" class="cmv-listado" data-vista="listado">
        <div id="controlMovilesChips" class="cmv-chips" aria-label="Móviles disponibles"></div>
      </div>

      <form id="controlMovilesFormulario" class="cmv-formulario hidden" data-vista="formulario" novalidate>
        <div class="cmv-seleccionado">
          <span>Móvil seleccionado</span>
          <strong id="controlMovilNumeroSeleccionado">---</strong>
        </div>

        <div class="cmv-form-grid">
          <label class="cmv-campo">
            <span>Kilometraje</span>
            <input id="controlMovilKilometraje" type="number" inputmode="numeric" autocomplete="off" placeholder="Kilometraje" />
          </label>
          <label class="cmv-campo">
            <span>Combustible</span>
            <select id="controlMovilCombustible">
              <option value="">Seleccionar</option>
              <option value="0">0</option>
              <option value="1/4">1/4</option>
              <option value="1/2">1/2</option>
              <option value="3/4">3/4</option>
              <option value="FULL">FULL</option>
            </select>
          </label>
        </div>

        <label class="cmv-campo cmv-observaciones">
          <span>Observaciones</span>
          <textarea id="controlMovilObservaciones" rows="4" placeholder="Novedades u observaciones del control"></textarea>
        </label>

        <div class="cmv-fotos">
          <label class="cmv-campo">
            <span>Foto 1</span>
            <input id="controlMovilFoto1" type="file" accept="image/*,video/*" />
            <img id="controlMovilPreview1" class="cmv-preview hidden" alt="Vista previa foto 1" />
          </label>
          <label class="cmv-campo">
            <span>Foto 2</span>
            <input id="controlMovilFoto2" type="file" accept="image/*,video/*" />
            <img id="controlMovilPreview2" class="cmv-preview hidden" alt="Vista previa foto 2" />
          </label>
        </div>

        <div class="cmv-acciones">
          <button id="controlMovilesVolver" class="cmv-btn cmv-btn-secundario" type="button">Volver</button>
          <button id="controlMovilesGuardar" class="cmv-btn cmv-btn-guardar" type="submit">Guardar</button>
        </div>
      </form>

      <button id="controlMovilesSalir" class="cmv-salir" type="button">Salir</button>
    </section>
  `;
}

function asegurarHtml(root) {
  if (root.id === "controlMovilesRoot" || root.querySelector?.("#controlMovilesRoot")) {
    return root.id === "controlMovilesRoot" ? root : root.querySelector("#controlMovilesRoot");
  }

  root.innerHTML = templateHtml();
  return root.querySelector("#controlMovilesRoot");
}

function capturarRefs(root) {
  return {
    root,
    estado: q(root, "#controlMovilesEstado"),
    ayudaBtn: q(root, "#controlMovilesAyudaBtn"),
    ayudaPopup: q(root, "#controlMovilesAyudaPopup"),
    listado: q(root, "#controlMovilesListado"),
    chips: q(root, "#controlMovilesChips"),
    formulario: q(root, "#controlMovilesFormulario"),
    numero: q(root, "#controlMovilNumeroSeleccionado"),
    kilometraje: q(root, "#controlMovilKilometraje"),
    combustible: q(root, "#controlMovilCombustible"),
    observaciones: q(root, "#controlMovilObservaciones"),
    fueraServicio: q(root, "#controlMovilFueraServicio"),
    foto1: q(root, "#controlMovilFoto1"),
    foto2: q(root, "#controlMovilFoto2"),
    preview1: q(root, "#controlMovilPreview1"),
    preview2: q(root, "#controlMovilPreview2"),
    volver: q(root, "#controlMovilesVolver"),
    guardar: q(root, "#controlMovilesGuardar"),
    salir: q(root, "#controlMovilesSalir"),
  };
}

function setEstado(texto) {
  if (refs?.estado) refs.estado.textContent = texto || "";
}

function limpiarFormulario() {
  if (!refs) return;
  if (refs.numero) refs.numero.textContent = "---";
  if (refs.kilometraje) refs.kilometraje.value = "";
  if (refs.combustible) refs.combustible.value = "";
  if (refs.observaciones) refs.observaciones.value = "";
  [refs.foto1, refs.foto2].forEach((input) => {
    if (input) input.value = "";
  });
  [refs.preview1, refs.preview2].forEach((img) => {
    if (!img) return;
    img.src = "";
    img.classList.add("hidden");
  });
}

function renderChips() {
  if (!refs?.chips) return;

  refs.chips.innerHTML = "";

  const crearGrupo = (titulo, items, tipo) => {
    const grupo = document.createElement("section");
    grupo.className = `cmv-grupo cmv-grupo-${tipo}`;

    const h = document.createElement("h3");
    h.className = "cmv-grupo-titulo";
    h.textContent = titulo;
    grupo.appendChild(h);

    const grid = document.createElement("div");
    grid.className = "cmv-grupo-grid";

    items.forEach((item) => {
      const numero = typeof item === "string" ? item : item.numero;
      const cc = typeof item === "string" ? "" : item.cc;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cmv-chip";
      btn.dataset.numero = numero;
      btn.innerHTML = cc ? `${numero} <small>(${cc})</small>` : numero;
      btn.addEventListener("click", () => seleccionarMovil(numero, btn));
      grid.appendChild(btn);
    });

    grupo.appendChild(grid);
    refs.chips.appendChild(grupo);
  };

  crearGrupo("MÓVILES", MOVILES_BASE, "moviles");
  crearGrupo("MOTOS", MOTOS_BASE, "motos");
}

function mostrarListado() {
  movilSeleccionado = null;
  refs?.root?.classList.remove("cmv-form-activo");
  refs?.listado?.classList.remove("hidden");
  refs?.formulario?.classList.add("hidden");
  if (refs?.salir) refs.salir.classList.remove("hidden");
  refs?.root?.querySelectorAll(".cmv-chip-activo").forEach((b) => b.classList.remove("cmv-chip-activo"));
  limpiarFormulario();
  setEstado("Seleccione un móvil en servicio.");
}

function seleccionarMovil(numero, boton) {
  movilSeleccionado = numero;
  refs?.root?.querySelectorAll(".cmv-chip-activo").forEach((b) => b.classList.remove("cmv-chip-activo"));
  boton?.classList.add("cmv-chip-activo");

  if (refs?.numero) refs.numero.textContent = numero;
  if (refs?.listado) refs.listado.classList.add("hidden");
  if (refs?.formulario) refs.formulario.classList.remove("hidden");
  if (refs?.salir) refs.salir.classList.add("hidden");
  refs?.root?.classList.add("cmv-form-activo");
  setEstado("Complete kilometraje, combustible, observaciones y fotos si corresponde.");

  setTimeout(() => refs?.kilometraje?.focus(), 50);
}

function previewArchivo(input, preview) {
  if (!input || !preview) return;
  const file = input.files?.[0];
  if (!file || !file.type?.startsWith("image/")) {
    preview.src = "";
    preview.classList.add("hidden");
    return;
  }
  preview.src = URL.createObjectURL(file);
  preview.classList.remove("hidden");
}

async function guardarControl(event) {
  event?.preventDefault?.();
  if (!movilSeleccionado || !refs) return;

  const payload = {
    numero: movilSeleccionado,
    kilometraje: refs.kilometraje?.value?.trim() || "",
    combustible: refs.combustible?.value || "",
    observaciones: refs.observaciones?.value?.trim() || "",
    fueraServicio: !!refs.fueraServicio?.checked,
    fecha: new Date().toISOString(),
  };

  const original = refs.guardar?.textContent || "Guardar";
  if (refs.guardar) {
    refs.guardar.textContent = "Guardando...";
    refs.guardar.classList.add("guardando");
    refs.guardar.disabled = true;
  }
  setEstado("Guardando...");

  try {
    window.dispatchEvent(new CustomEvent("control-moviles:guardar", { detail: payload }));

    const api = window.WSP?.modules?.controlMovilesRepo || window.WSP?.controlMovilesRepo || null;
    if (api && typeof api.guardar === "function") {
      await api.guardar(payload);
    } else if (api && typeof api.guardarControlMovil === "function") {
      await api.guardarControlMovil(payload);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    setEstado("Control guardado.");
    setTimeout(mostrarListado, 450);
  } catch (error) {
    console.error("[Control móviles] Error al guardar", error);
    setEstado("No se pudo guardar. Revise la conexión o intente nuevamente.");
  } finally {
    if (refs.guardar) {
      refs.guardar.textContent = original;
      refs.guardar.classList.remove("guardando");
      refs.guardar.disabled = false;
    }
  }
}

function alternarAyuda(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (!refs?.ayudaPopup || !refs?.ayudaBtn) return;
  const abrir = refs.ayudaPopup.classList.contains("hidden");
  refs.ayudaPopup.classList.toggle("hidden", !abrir);
  refs.ayudaBtn.classList.toggle("ayuda-activa", abrir);
  refs.ayudaBtn.setAttribute("aria-expanded", abrir ? "true" : "false");
}

function cerrarAyudaFuera(event) {
  if (!refs?.ayudaPopup || refs.ayudaPopup.classList.contains("hidden")) return;
  if (refs.ayudaPopup.contains(event.target) || refs.ayudaBtn?.contains(event.target)) return;
  refs.ayudaPopup.classList.add("hidden");
  refs.ayudaBtn?.classList.remove("ayuda-activa");
  refs.ayudaBtn?.setAttribute("aria-expanded", "false");
}

function vincularEventos() {
  if (!refs || refs.root.dataset.cmvInicializado === "1") return;

  refs.root.dataset.cmvInicializado = "1";
  refs.ayudaBtn?.addEventListener("click", alternarAyuda);
  document.addEventListener("click", cerrarAyudaFuera);
  refs.volver?.addEventListener("click", mostrarListado);
  refs.salir?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("control-moviles:salir"));
  });
  refs.formulario?.addEventListener("submit", guardarControl);
  refs.foto1?.addEventListener("change", () => previewArchivo(refs.foto1, refs.preview1));
  refs.foto2?.addEventListener("change", () => previewArchivo(refs.foto2, refs.preview2));
}

export function iniciar(contexto = {}) {
  const contenedor = getRoot(contexto);
  const root = asegurarHtml(contenedor);
  refs = capturarRefs(root);
  renderChips();
  vincularEventos();
  mostrarListado();
  inicializado = true;

  window.WSP = window.WSP || {};
  window.WSP.modules = window.WSP.modules || {};
  window.WSP.modules.controlMoviles = api;

  return api;
}

export function destruir() {
  inicializado = false;
  movilSeleccionado = null;
  refs = null;
}

export function seleccionar(numero) {
  const boton = refs?.root?.querySelector(`.cmv-chip[data-numero="${String(numero)}"]`);
  seleccionarMovil(String(numero), boton);
}

export function volver() {
  mostrarListado();
}

const api = {
  iniciar,
  inicio: iniciar,
  init: iniciar,
  iniciarModulo: iniciar,
  montar: iniciar,
  mount: iniciar,
  destruir,
  seleccionar,
  volver,
  get inicializado() {
    return inicializado;
  },
};

export const inicio = iniciar;
export const init = iniciar;
export const iniciarModulo = iniciar;
export const montar = iniciar;
export const mount = iniciar;
export default iniciar;

if (typeof window !== "undefined") {
  window.ControlMovilesModulo = api;
}
