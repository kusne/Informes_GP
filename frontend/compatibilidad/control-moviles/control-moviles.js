// Control_Moviles/control-moviles.js - referencia funcional video
(function () {
  "use strict";

  window.WSP = window.WSP || {};
  window.WSP.modules = window.WSP.modules || {};

  const VERSION = "control-moviles-video-ref-20260704";

  const BASE_NUMEROS = ["12428", "12502"];
  const MOVILES_DEFAULT = [
    { numero: "12428", tipo: "MOVIL", modelo: "", condicion: true },
    { numero: "12502", tipo: "MOVIL", modelo: "", condicion: true },
    { numero: "12087", tipo: "MOTO", modelo: "250", condicion: true },
    { numero: "12088", tipo: "MOTO", modelo: "250", condicion: true },
    { numero: "12089", tipo: "MOTO", modelo: "250", condicion: true },
    { numero: "12090", tipo: "MOTO", modelo: "250", condicion: true },
    { numero: "12091", tipo: "MOTO", modelo: "250", condicion: true },
    { numero: "8989", tipo: "MOTO", modelo: "300", condicion: true },
    { numero: "9029", tipo: "MOTO", modelo: "300", condicion: true },
    { numero: "9030", tipo: "MOTO", modelo: "300", condicion: true },
    { numero: "9071", tipo: "MOTO", modelo: "300", condicion: true },
    { numero: "9087", tipo: "MOTO", modelo: "650", condicion: true },
    { numero: "9088", tipo: "MOTO", modelo: "650", condicion: true },
    { numero: "9091", tipo: "MOTO", modelo: "650", condicion: true },
    { numero: "9092", tipo: "MOTO", modelo: "650", condicion: true },
  ];

  const estado = {
    activa: false,
    seleccionado: null,
    controles: new Map(),
    moviles: MOVILES_DEFAULT.map((m) => ({ ...m })),
    refs: {},
  };

  function $(id) {
    return document.getElementById(id);
  }

  function normalizar(txt) {
    return String(txt || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function limpiar(txt) {
    return String(txt || "").replace(/\s+/g, " ").trim();
  }

  function refs() {
    estado.refs = {
      bloque: $("bloqueControlMoviles"),
      estado: $("controlMovilesEstado"),
      chips: $("controlMovilesChips"),
      form: $("controlMovilesFormulario"),
      numero: $("controlMovilNumeroSeleccionado"),
      km: $("controlMovilKilometraje"),
      combustible: $("controlMovilCombustible"),
      obs: $("controlMovilObservaciones"),
      fuera: $("controlMovilFueraServicio"),
      ayudaBtn: $("controlMovilesAyudaBtn"),
      ayudaPopup: $("controlMovilesAyudaPopup"),
      foto1: $("controlMovilFoto1"),
      foto2: $("controlMovilFoto2"),
      preview1: $("controlMovilPreview1"),
      preview2: $("controlMovilPreview2"),
      guardar: $("controlMovilGuardar"),
      btnEnviar: $("btnEnviar"),
    };
    return estado.refs;
  }

  function setTextoEstado(texto) {
    const r = refs();
    if (r.estado) r.estado.textContent = texto || "";
  }

  function ccMoto(movil) {
    const modelo = normalizar(movil.modelo);
    if (modelo.includes("250")) return "(250cc.)";
    if (modelo.includes("300")) return "(300cc.)";
    if (modelo.includes("650")) return "(650cc.)";
    if (modelo.includes("400")) return "(400cc.)";
    return "";
  }

  function escapeHtml(txt) {
    return String(txt || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function grupoHtml(titulo, moviles, tipo) {
    if (!moviles.length) return "";
    return `
      <div class="control-moviles-grupo control-moviles-grupo-${tipo}">
        <div class="control-moviles-grupo-titulo">${escapeHtml(titulo)}</div>
        <div class="control-moviles-grupo-grid">
          ${moviles.map((movil) => {
            const numero = escapeHtml(movil.numero);
            const cc = tipo === "motos" ? ccMoto(movil) : "";
            const controlado = estado.controles.has(movil.numero) ? " controlado" : "";
            return `<button type="button" class="control-movil-chip${controlado}" data-control-movil-numero="${numero}">${numero}${cc ? ` <small>${escapeHtml(cc)}</small>` : ""}</button>`;
          }).join("")}
        </div>
      </div>`;
  }

  function renderLista() {
    const r = refs();
    if (!r.chips) return;

    const movilesBase = estado.moviles.filter((m) => BASE_NUMEROS.includes(m.numero));
    const motos = estado.moviles.filter((m) => normalizar(m.tipo) === "MOTO");

    r.chips.innerHTML = grupoHtml("Móviles", movilesBase, "base") + grupoHtml("Motos", motos, "motos");
    setTextoEstado("Seleccione un móvil en servicio.");
  }

  function mostrarLista() {
    const r = refs();
    estado.seleccionado = null;
    document.body.classList.add("modo-control-moviles");
    document.body.classList.remove("control-movil-seleccionado-activo");

    if (r.chips) r.chips.classList.remove("hidden");
    if (r.form) r.form.classList.add("hidden");

    if (r.btnEnviar) {
      r.btnEnviar.classList.remove("hidden");
      r.btnEnviar.style.display = "block";
      r.btnEnviar.textContent = "Salir";
    }

    renderLista();
  }

  function limpiarFotos() {
    const r = refs();
    if (r.foto1) r.foto1.value = "";
    if (r.foto2) r.foto2.value = "";
    if (r.preview1) {
      r.preview1.src = "";
      r.preview1.classList.add("hidden");
    }
    if (r.preview2) {
      r.preview2.src = "";
      r.preview2.classList.add("hidden");
    }
  }

  function cargarDatosFormulario(movil) {
    const r = refs();
    const guardado = estado.controles.get(movil.numero) || {};

    if (r.numero) r.numero.textContent = movil.numero;
    if (r.km) r.km.value = guardado.kilometraje || movil.kilometraje || "";
    if (r.combustible) r.combustible.value = guardado.combustible || movil.combustible || "";
    if (r.obs) r.obs.value = guardado.observaciones || movil.observaciones_novedades || "";
    if (r.fuera) r.fuera.checked = guardado.fueraServicio ?? !movil.condicion;
    if (r.guardar) {
      r.guardar.disabled = false;
      r.guardar.classList.remove("guardando");
      r.guardar.textContent = "Guardar";
    }
    limpiarFotos();
  }

  function seleccionarMovil(numero) {
    const movil = estado.moviles.find((m) => m.numero === limpiar(numero));
    if (!movil) return;

    const r = refs();
    estado.seleccionado = movil;

    document.body.classList.add("modo-control-moviles", "control-movil-seleccionado-activo");

    if (r.chips) r.chips.classList.add("hidden");
    if (r.form) r.form.classList.remove("hidden");
    if (r.btnEnviar) r.btnEnviar.style.display = "none";

    cargarDatosFormulario(movil);
    setTextoEstado("Complete kilometraje, combustible, observaciones y fotos si corresponde.");

    window.setTimeout(() => {
      refs().km?.focus?.();
    }, 80);
  }

  function preview(input, img) {
    if (!input || !img) return;
    const file = input.files && input.files[0];
    if (!file) {
      img.src = "";
      img.classList.add("hidden");
      return;
    }
    try {
      img.src = URL.createObjectURL(file);
      img.classList.remove("hidden");
    } catch (_) {
      img.classList.add("hidden");
    }
  }

  function guardarActual() {
    const r = refs();
    const movil = estado.seleccionado;
    if (!movil) return;

    const datos = {
      numero: movil.numero,
      tipo: movil.tipo,
      modelo: movil.modelo,
      kilometraje: limpiar(r.km?.value || ""),
      combustible: limpiar(r.combustible?.value || ""),
      observaciones: limpiar(r.obs?.value || ""),
      fueraServicio: !!r.fuera?.checked,
      fechaControl: new Date().toISOString(),
    };

    estado.controles.set(movil.numero, datos);
    movil.kilometraje = datos.kilometraje;
    movil.combustible = datos.combustible;
    movil.observaciones_novedades = datos.observaciones;
    movil.condicion = !datos.fueraServicio;

    if (r.guardar) {
      r.guardar.disabled = true;
      r.guardar.classList.add("guardando");
      r.guardar.textContent = "Guardando...";
    }

    document.dispatchEvent(new CustomEvent("control-moviles:guardar", {
      detail: {
        modo: "CONTROL_MOVILES",
        movil: { ...datos },
        fotos: {
          foto1: r.foto1?.files?.[0] || null,
          foto2: r.foto2?.files?.[0] || null,
        },
      },
    }));

    window.setTimeout(() => {
      setTextoEstado("Control guardado para móvil " + movil.numero + ".");
      mostrarLista();
    }, 650);
  }

  function abrirAyuda() {
    const r = refs();
    if (!r.ayudaPopup || !r.ayudaBtn) return;
    r.ayudaPopup.classList.remove("hidden");
    r.ayudaBtn.classList.add("ayuda-activa");
    r.ayudaBtn.setAttribute("aria-expanded", "true");
  }

  function cerrarAyuda() {
    const r = refs();
    if (!r.ayudaPopup || !r.ayudaBtn) return;
    r.ayudaPopup.classList.add("hidden");
    r.ayudaBtn.classList.remove("ayuda-activa");
    r.ayudaBtn.setAttribute("aria-expanded", "false");
  }

  function alternarAyuda(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const r = refs();
    if (!r.ayudaPopup) return;
    if (r.ayudaPopup.classList.contains("hidden")) abrirAyuda();
    else cerrarAyuda();
  }

  function elegirIniciaEnSelector() {
    const selector = document.querySelector("select[data-igp-selector-principal='1']")
      || Array.from(document.querySelectorAll("select")).find((sel) => {
        const opciones = Array.from(sel.options || []).map((o) => normalizar(o.textContent || o.value));
        return opciones.includes("INICIA") && opciones.includes("FINALIZA");
      });

    if (!selector) return;
    const op = Array.from(selector.options || []).find((o) => normalizar(o.textContent || o.value) === "INICIA") || selector.options[0];
    if (!op) return;
    selector.value = op.value;
    selector.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function salirControlMoviles() {
    if (estado.seleccionado) {
      mostrarLista();
      return;
    }
    setActiva(false);
    elegirIniciaEnSelector();
  }

  function setActiva(activa) {
    const r = refs();
    estado.activa = !!activa;

    if (r.bloque) r.bloque.classList.toggle("hidden", !estado.activa);
    document.body.classList.toggle("modo-control-moviles", estado.activa);

    if (!estado.activa) {
      estado.seleccionado = null;
      document.body.classList.remove("control-movil-seleccionado-activo");
      cerrarAyuda();
      if (r.form) r.form.classList.add("hidden");
      if (r.chips) r.chips.classList.remove("hidden");
      if (r.btnEnviar) {
        r.btnEnviar.style.display = "";
        if (r.btnEnviar.textContent.trim().toUpperCase() === "SALIR") {
          r.btnEnviar.textContent = "Enviar por WhatsApp";
        }
      }
      return;
    }

    mostrarLista();
  }

  function bindUnaVez() {
    if (document.body.dataset.boundControlMovilesVideoRef === "1") return;
    document.body.dataset.boundControlMovilesVideoRef = "1";

    document.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-control-movil-numero]");
      if (!chip) return;
      event.preventDefault();
      event.stopPropagation();
      seleccionarMovil(chip.dataset.controlMovilNumero);
    }, true);

    document.addEventListener("click", (event) => {
      if (event.target.closest("#controlMovilesAyudaBtn")) {
        alternarAyuda(event);
        return;
      }

      const r = refs();
      if (!r.ayudaPopup || r.ayudaPopup.classList.contains("hidden")) return;
      if (r.ayudaPopup.contains(event.target) || r.ayudaBtn?.contains(event.target)) return;
      cerrarAyuda();
    }, true);

    document.addEventListener("click", (event) => {
      if (!event.target.closest("#controlMovilGuardar")) return;
      event.preventDefault();
      event.stopPropagation();
      guardarActual();
    }, true);

    document.addEventListener("change", (event) => {
      const r = refs();
      if (event.target === r.foto1) preview(r.foto1, r.preview1);
      if (event.target === r.foto2) preview(r.foto2, r.preview2);
    });

    document.addEventListener("submit", (event) => {
      if (event.target?.id !== "controlMovilesFormulario") return;
      event.preventDefault();
      event.stopPropagation();
      guardarActual();
    }, true);

    document.addEventListener("click", (event) => {
      const r = refs();
      if (!r.btnEnviar || event.target !== r.btnEnviar) return;
      if (!document.body.classList.contains("modo-control-moviles")) return;
      event.preventDefault();
      event.stopPropagation();
      salirControlMoviles();
    }, true);
  }

  async function cargarHtmlSiFalta(mount) {
    if ($("bloqueControlMoviles")) return;

    try {
      const resp = await fetch(new URL("frontend/compatibilidad/control-moviles/control-moviles.html?v=" + VERSION, document.baseURI).href, { cache: "no-store" });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const html = await resp.text();
      (mount || document.body).insertAdjacentHTML("beforeend", html);
    } catch (err) {
      console.warn("[Control_Moviles] No se pudo cargar HTML externo. Usando fallback.", err);
      (mount || document.body).insertAdjacentHTML("beforeend", `
        <section id="bloqueControlMoviles" class="bloque-control-moviles hidden">
          <div class="control-moviles-topbar"><h2 class="control-moviles-title">Control de móviles</h2><label class="control-moviles-fuera-servicio"><input type="checkbox" id="controlMovilFueraServicio"><span>Fuera de Servicio</span></label></div>
          <div id="controlMovilesAyudaWrap" class="control-moviles-ayuda-wrap"><button type="button" id="controlMovilesAyudaBtn" class="control-moviles-ayuda-btn">?</button><div id="controlMovilesAyudaPopup" class="control-moviles-ayuda-popup hidden"><p><strong>Que Controlar? Sistemas Pasivos y Activos</strong></p><p><strong>Anotar:</strong> kilometraje y Combustible</p><p><strong>Revisar:</strong> Luces Altas/Bajas/de giro/balizas y Sirena; Batería, Cubiertas y Nivel Aceite, Gato, Matafuego.</p><p><strong>Ejemplo de Novedad:</strong> matafuego vencido--cubierta lisa--sin batería--luz quemada</p><p>Anotar en Observaciones las novedades; adjuntar fotos/video y apretar guardar.</p></div></div>
          <p id="controlMovilesEstado" class="control-moviles-estado">Seleccione un móvil en servicio.</p>
          <div id="controlMovilesChips" class="control-moviles-chips"></div>
          <form id="controlMovilesFormulario" class="control-moviles-formulario hidden" novalidate><div class="control-moviles-form-header"><span class="control-moviles-label">Móvil seleccionado</span><strong id="controlMovilNumeroSeleccionado">---</strong></div><div class="control-moviles-form-grid"><label class="control-moviles-campo"><span>Kilometraje</span><input id="controlMovilKilometraje"></label><label class="control-moviles-campo"><span>Combustible</span><select id="controlMovilCombustible"><option></option><option>Reserva</option><option>1/4</option><option>+1/4</option><option>1/2</option><option>+1/2</option><option>3/4</option><option>Lleno</option></select></label></div><label class="control-moviles-campo control-moviles-campo-full"><span>Observaciones</span><textarea id="controlMovilObservaciones" rows="4"></textarea></label><div class="control-moviles-fotos"><label class="control-moviles-campo"><span>Foto 1</span><input id="controlMovilFoto1" type="file" accept="image/*,video/*"><img id="controlMovilPreview1" class="control-moviles-preview hidden" alt=""></label><label class="control-moviles-campo"><span>Foto 2</span><input id="controlMovilFoto2" type="file" accept="image/*,video/*"><img id="controlMovilPreview2" class="control-moviles-preview hidden" alt=""></label></div><button type="button" id="controlMovilGuardar" class="control-moviles-guardar">Guardar</button></form>
        </section>`);
    }
  }

  async function init(config = {}) {
    const mount = typeof config.mount === "string" ? document.querySelector(config.mount) : config.mount;
    await cargarHtmlSiFalta(mount || document.body);
    refs();
    bindUnaVez();
    setActiva(false);
    return { ok: true, version: VERSION };
  }

  window.WSP.modules.controlMoviles = {
    version: VERSION,
    init,
    setActiva,
    render: renderLista,
    seleccionarMovil,
    volverASeleccion: mostrarLista,
    salirControlMoviles,
  };

  console.log("[Control_Moviles] cargado", VERSION);
})();
