(function () {
  "use strict";

  window.WSP = window.WSP || {};
  window.WSP.modules = window.WSP.modules || {};

  function getEl(id) {
    return document.getElementById(id);
  }

  function defaultRefs() {
    return {
      bloqueControlMoviles: getEl("bloqueControlMoviles"),
      controlMovilesEstado: getEl("controlMovilesEstado"),
      controlMovilesChips: getEl("controlMovilesChips"),
      controlMovilesFormulario: getEl("controlMovilesFormulario"),
      controlMovilNumeroSeleccionado: getEl("controlMovilNumeroSeleccionado"),
      controlMovilKilometraje: getEl("controlMovilKilometraje"),
      controlMovilCombustible: getEl("controlMovilCombustible"),
      controlMovilObservaciones: getEl("controlMovilObservaciones"),
      controlMovilFueraServicio: getEl("controlMovilFueraServicio"),
      controlMovilesAyudaWrap: getEl("controlMovilesAyudaWrap"),
      controlMovilesAyudaBtn: getEl("controlMovilesAyudaBtn"),
      controlMovilesAyudaPopup: getEl("controlMovilesAyudaPopup"),
      controlMovilFoto1: getEl("controlMovilFoto1"),
      controlMovilFoto2: getEl("controlMovilFoto2"),
      controlMovilPreview1: getEl("controlMovilPreview1"),
      controlMovilPreview2: getEl("controlMovilPreview2"),
      btnEnviar: getEl("btnEnviar"),
    };
  }

  function withRefs(refs) {
    return Object.assign(defaultRefs(), refs || {});
  }

  function noop() {}

  function limpiarTextoSimple(txt) {
    return String(txt || "").replace(/\s+/g, " ").trim();
  }

  function normalizarBasicoSinAcentos(txt) {
    return String(txt || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function setTextoEstado(texto, refs = {}) {
    const r = withRefs(refs);
    if (r.controlMovilesEstado) r.controlMovilesEstado.textContent = texto || "";
  }

  function cerrarAyuda(refs = {}) {
    const r = withRefs(refs);
    if (!r.controlMovilesAyudaPopup || !r.controlMovilesAyudaBtn) return;
    r.controlMovilesAyudaPopup.classList.add("hidden");
    r.controlMovilesAyudaBtn.classList.remove("ayuda-activa");
    r.controlMovilesAyudaBtn.setAttribute("aria-expanded", "false");
  }

  function abrirAyuda(refs = {}) {
    const r = withRefs(refs);
    if (!r.controlMovilesAyudaPopup || !r.controlMovilesAyudaBtn) return;
    r.controlMovilesAyudaPopup.classList.remove("hidden");
    r.controlMovilesAyudaBtn.classList.add("ayuda-activa");
    r.controlMovilesAyudaBtn.setAttribute("aria-expanded", "true");
  }

  function alternarAyuda(event, refs = {}) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const r = withRefs(refs);
    if (!r.controlMovilesAyudaPopup) return;

    const abierta = !r.controlMovilesAyudaPopup.classList.contains("hidden");
    if (abierta) cerrarAyuda(r);
    else abrirAyuda(r);
  }

  function actualizarBotonSalir(refs = {}, opts = {}) {
    const r = withRefs(refs);
    const enControlMoviles = !!opts.enControlMoviles;
    const hayMovilSeleccionado = !!opts.hayMovilSeleccionado;

    if (!r.btnEnviar) return;

    if (!enControlMoviles) {
      document.body.classList.remove("modo-control-moviles", "control-movil-seleccionado-activo");
      r.btnEnviar.classList.remove("hidden");
      r.btnEnviar.style.display = "";
      r.btnEnviar.textContent = "Enviar por WhatsApp";
      return;
    }

    document.body.classList.add("modo-control-moviles");
    document.body.classList.toggle("control-movil-seleccionado-activo", hayMovilSeleccionado);

    if (hayMovilSeleccionado) {
      r.btnEnviar.classList.add("hidden");
      r.btnEnviar.style.display = "none";
    } else {
      r.btnEnviar.classList.remove("hidden");
      r.btnEnviar.style.display = "block";
      r.btnEnviar.textContent = "Salir";
    }
  }

  function formularioActivo(refs = {}, movilSeleccionado = null) {
    const r = withRefs(refs);
    return !!movilSeleccionado?.numero
      && !!r.controlMovilesFormulario
      && !r.controlMovilesFormulario.classList.contains("hidden");
  }

  function camposEnEdicion(refs = {}) {
    const r = withRefs(refs);
    const active = document.activeElement;
    return !!active && [
      r.controlMovilKilometraje,
      r.controlMovilCombustible,
      r.controlMovilObservaciones,
      r.controlMovilFueraServicio,
      r.controlMovilFoto1,
      r.controlMovilFoto2,
    ].includes(active);
  }

  function aplicarMovilAlFormulario(movil, refs = {}) {
    const r = withRefs(refs);
    if (!movil) return;

    if (r.controlMovilNumeroSeleccionado) r.controlMovilNumeroSeleccionado.textContent = movil.numero || "---";
    if (r.controlMovilKilometraje) r.controlMovilKilometraje.value = movil.kilometraje || "";
    if (r.controlMovilCombustible) r.controlMovilCombustible.value = movil.combustible || "";
    if (r.controlMovilObservaciones) r.controlMovilObservaciones.value = movil.observaciones_novedades || movil.observaciones || "";
    if (r.controlMovilFueraServicio) {
      r.controlMovilFueraServicio.disabled = false;
      r.controlMovilFueraServicio.checked = !movil.condicion;
    }
  }

  function mostrarFormulario(refs = {}) {
    const r = withRefs(refs);
    document.body.classList.add("control-movil-seleccionado-activo");

    if (r.controlMovilesChips) {
      r.controlMovilesChips.classList.add("hidden");
      r.controlMovilesChips.style.display = "none";
    }

    if (r.controlMovilesFormulario) {
      r.controlMovilesFormulario.classList.remove("hidden");
      r.controlMovilesFormulario.style.display = "grid";
    }
  }

  function limpiarFotos(refs = {}) {
    const r = withRefs(refs);
    [r.controlMovilFoto1, r.controlMovilFoto2].forEach((input) => {
      if (input) input.value = "";
    });
    [r.controlMovilPreview1, r.controlMovilPreview2].forEach((img) => {
      if (!img) return;
      img.src = "";
      img.classList.add("hidden");
    });
  }

  function mostrarPreview(input, preview) {
    if (!input || !preview) return;
    const file = input.files?.[0];
    if (!file) {
      preview.src = "";
      preview.classList.add("hidden");
      return;
    }
    preview.src = URL.createObjectURL(file);
    preview.classList.remove("hidden");
  }

  function mostrarPantallaPrincipal(refs = {}) {
    const r = withRefs(refs);
    document.body.classList.remove("control-movil-seleccionado-activo");

    if (r.controlMovilesFormulario) {
      r.controlMovilesFormulario.classList.add("hidden");
      r.controlMovilesFormulario.style.display = "none";
    }

    if (r.controlMovilesChips) {
      r.controlMovilesChips.classList.remove("hidden");
      r.controlMovilesChips.style.display = "grid";
    }
  }

  function resetFormulario(refs = {}) {
    const r = withRefs(refs);
    if (r.controlMovilNumeroSeleccionado) r.controlMovilNumeroSeleccionado.textContent = "---";
    if (r.controlMovilKilometraje) r.controlMovilKilometraje.value = "";
    if (r.controlMovilCombustible) r.controlMovilCombustible.value = "";
    if (r.controlMovilObservaciones) r.controlMovilObservaciones.value = "";
    if (r.controlMovilFueraServicio) {
      r.controlMovilFueraServicio.checked = false;
      r.controlMovilFueraServicio.disabled = true;
    }
    limpiarFotos(r);
  }

  function volverASeleccion(refs = {}, opts = {}) {
    const r = withRefs(refs);
    mostrarPantallaPrincipal(r);
    resetFormulario(r);

    const setEstado = typeof opts.setEstado === "function" ? opts.setEstado : (texto) => setTextoEstado(texto, r);
    setEstado(opts.hayMoviles ? "Seleccione un móvil en servicio." : "No hay móviles en servicio para controlar.");
  }

  function setActiva(refs = {}, activa) {
    const r = withRefs(refs);
    if (r.bloqueControlMoviles) r.bloqueControlMoviles.classList.toggle("hidden", !activa);
    document.body.classList.toggle("modo-control-moviles", !!activa);

    if (!activa) {
      cerrarAyuda(r);
      document.body.classList.remove("modo-control-moviles", "control-movil-seleccionado-activo");
      if (r.btnEnviar) {
        r.btnEnviar.classList.remove("hidden");
        r.btnEnviar.style.display = "";
        r.btnEnviar.textContent = "Enviar por WhatsApp";
      }
      return;
    }

    mostrarPantallaPrincipal(r);
  }

  function prioridadNumeroBase(numero, baseNumeros = []) {
    const idx = baseNumeros.indexOf(limpiarTextoSimple(numero));
    return idx >= 0 ? idx : Number.MAX_SAFE_INTEGER;
  }

  function cilindradaMoto(movil, normalizarBasico = normalizarBasicoSinAcentos) {
    const modelo = normalizarBasico(movil?.modelo || "");
    if (modelo.includes("250")) return "(250cc.)";
    if (modelo.includes("300")) return "(300cc.)";
    if (modelo.includes("650")) return "(650cc.)";
    if (modelo.includes("400")) return "(400cc.)";
    return "";
  }

  function construirFirmaRender(ctx = {}) {
    const visibles = Array.isArray(ctx.visibles) ? ctx.visibles : [];
    const limpiar = typeof ctx.limpiarTextoSimple === "function" ? ctx.limpiarTextoSimple : limpiarTextoSimple;
    const normalizarTipo = typeof ctx.normalizarTipoMovilControl === "function" ? ctx.normalizarTipoMovilControl : ((v) => limpiar(v).toUpperCase());
    const obtenerLock = typeof ctx.obtenerLockControlMovil === "function" ? ctx.obtenerLockControlMovil : (() => null);
    const lockEsPropio = typeof ctx.lockControlMovilEsPropio === "function" ? ctx.lockControlMovilEsPropio : (() => false);

    return visibles
      .map((movil) => {
        const numero = limpiar(movil?.numero || "");
        const lock = obtenerLock(numero);
        const lockEstado = lock ? (lockEsPropio(lock) ? "propio" : "otro") : "sin-lock";
        return [
          numero,
          normalizarTipo(movil?.tipo),
          limpiar(movil?.modelo || ""),
          movil?.condicion ? "1" : "0",
          lockEstado,
        ].join(":");
      })
      .join("|");
  }

  function renderChips(ctx = {}) {
    const refs = withRefs(ctx.refs || {});
    const contenedor = refs.controlMovilesChips;
    if (!contenedor) return { firmaRender: ctx.firmaAnterior || "", renderizado: false };

    const visibles = Array.isArray(ctx.visibles) ? ctx.visibles : [];
    const limpiar = typeof ctx.limpiarTextoSimple === "function" ? ctx.limpiarTextoSimple : limpiarTextoSimple;
    const normalizarTipo = typeof ctx.normalizarTipoMovilControl === "function" ? ctx.normalizarTipoMovilControl : ((v) => limpiar(v).toUpperCase());
    const ordenar = typeof ctx.ordenarMovilesControl === "function" ? ctx.ordenarMovilesControl : ((a, b) => String(a?.numero || "").localeCompare(String(b?.numero || ""), "es", { numeric: true }));
    const obtenerLock = typeof ctx.obtenerLockControlMovil === "function" ? ctx.obtenerLockControlMovil : (() => null);
    const lockEsPropio = typeof ctx.lockControlMovilEsPropio === "function" ? ctx.lockControlMovilEsPropio : (() => false);
    const normalizarBasico = typeof ctx.normalizarBasicoSinAcentos === "function" ? ctx.normalizarBasicoSinAcentos : normalizarBasicoSinAcentos;
    const onSeleccionar = typeof ctx.onSeleccionar === "function" ? ctx.onSeleccionar : noop;
    const setEstado = typeof ctx.setEstado === "function" ? ctx.setEstado : ((texto) => setTextoEstado(texto, refs));
    const baseNumeros = Array.isArray(ctx.baseNumeros) ? ctx.baseNumeros.map((n) => limpiar(n)) : [];

    const firmaRender = construirFirmaRender({
      visibles,
      limpiarTextoSimple: limpiar,
      normalizarTipoMovilControl: normalizarTipo,
      obtenerLockControlMovil: obtenerLock,
      lockControlMovilEsPropio: lockEsPropio,
    });

    if (firmaRender === ctx.firmaAnterior && contenedor.dataset.renderListo === "1") {
      return { firmaRender, renderizado: false };
    }

    contenedor.dataset.renderListo = "1";
    contenedor.innerHTML = "";

    if (!visibles.length) {
      setEstado("No hay móviles en servicio para controlar.");
      return { firmaRender, renderizado: true };
    }

    setEstado("Seleccione un móvil en servicio.");

    const movilesBase = visibles
      .filter((movil) => baseNumeros.includes(limpiar(movil?.numero)))
      .sort((a, b) => prioridadNumeroBase(a?.numero, baseNumeros) - prioridadNumeroBase(b?.numero, baseNumeros));

    const motos = visibles
      .filter((movil) => normalizarTipo(movil?.tipo) === "MOTO")
      .sort(ordenar);

    const crearGrupo = (titulo, rows, tipoGrupo) => {
      if (!rows.length) return;

      const box = document.createElement("div");
      box.className = `control-moviles-grupo control-moviles-grupo-${tipoGrupo}`;

      const title = document.createElement("div");
      title.className = "control-moviles-grupo-titulo";
      title.textContent = titulo;
      box.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "control-moviles-grupo-grid";

      rows.forEach((movil) => {
        const lock = obtenerLock(movil.numero);
        const bloqueadoPorOtro = !!lock && !lockEsPropio(lock);
        const controlado = !!lock;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "control-movil-chip";
        btn.dataset.numero = movil.numero;
        btn.disabled = bloqueadoPorOtro;

        if (controlado) btn.classList.add("control-movil-chip-controlado");
        if (bloqueadoPorOtro) btn.classList.add("control-movil-chip-bloqueado");
        if (!movil.condicion) btn.classList.add("control-movil-chip-fuera-servicio");

        const candado = bloqueadoPorOtro ? ' <span class="control-movil-candado" aria-hidden="true">🔒</span>' : "";

        if (tipoGrupo === "motos") {
          const cc = cilindradaMoto(movil, normalizarBasico);
          btn.innerHTML = `${escapeHtml(movil.numero)}${cc ? ` <small>${escapeHtml(cc)}</small>` : ""}${candado}`;
        } else {
          btn.innerHTML = `${escapeHtml(movil.numero)}${candado}`;
        }

        if (bloqueadoPorOtro) {
          btn.title = "Ya fue controlado desde otra app. Queda bloqueado hasta que todas las apps salgan del modo control de móviles.";
        } else if (controlado) {
          btn.title = "Ya controlado desde esta app. Puede volver a editarlo.";
        } else {
          btn.title = "Seleccionar móvil";
        }

        btn.addEventListener("click", () => {
          if (bloqueadoPorOtro) return;
          onSeleccionar(movil.numero);
        });

        grid.appendChild(btn);
      });

      box.appendChild(grid);
      contenedor.appendChild(box);
    };

    crearGrupo("Móviles", movilesBase, "base");
    crearGrupo("Motos", motos, "motos");

    return { firmaRender, renderizado: true };
  }

  window.WSP.modules.controlMovilesUi = {
    version: "paso29-control-moviles-ui-20260605",
    defaultRefs,
    setTextoEstado,
    cerrarAyuda,
    abrirAyuda,
    alternarAyuda,
    actualizarBotonSalir,
    formularioActivo,
    camposEnEdicion,
    aplicarMovilAlFormulario,
    mostrarFormulario,
    mostrarPantallaPrincipal,
    limpiarFotos,
    mostrarPreview,
    resetFormulario,
    volverASeleccion,
    setActiva,
    construirFirmaRender,
    renderChips,
  };

  console.log("[WSP control móviles UI] cargado", window.WSP.modules.controlMovilesUi.version);
})();
