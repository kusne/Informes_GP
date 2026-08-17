// Control de móviles - comportamiento alineado con WSP.
(function () {
  "use strict";

  window.WSP = window.WSP || {};
  window.WSP.modules = window.WSP.modules || {};

  const VERSION = "control-moviles-wsp-behavior-20260817-2";
  const BASE_NUMEROS = ["12428", "10139", "12502"];
  const HEARTBEAT_MS = 15000;

  const estado = {
    activa: false,
    seleccionado: null,
    moviles: [],
    locks: new Map(),
    refs: {},
    api: null,
    realtime: null,
    heartbeat: null,
    refrescoTimer: null,
    sincronizando: false,
    padronOk: false,
    ownerId: obtenerIdSesion("igp_control_moviles_owner_id", "owner"),
    sessionId: obtenerIdSesion("igp_control_moviles_session_id", "session"),
  };

  function $(id) {
    return document.getElementById(id);
  }

  function limpiar(txt) {
    return String(txt || "").replace(/\s+/g, " ").trim();
  }

  function normalizar(txt) {
    return limpiar(txt)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  }

  function normalizarNumero(valor) {
    return limpiar(valor).replace(/\D+/g, "");
  }

  function crearId(prefix) {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return `${prefix}_${window.crypto.randomUUID()}`;
      }
    } catch (_) {}
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }

  function obtenerIdSesion(key, prefix) {
    try {
      const actual = window.sessionStorage?.getItem(key);
      if (actual) return actual;
      const nuevo = crearId(prefix);
      window.sessionStorage?.setItem(key, nuevo);
      return nuevo;
    } catch (_) {
      return crearId(prefix);
    }
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
      salir: $("controlMovilesSalir"),
      btnEnviar: $("btnEnviar"),
    };
    return estado.refs;
  }

  function setTextoEstado(texto) {
    const r = refs();
    if (r.estado) r.estado.textContent = texto || "";
  }

  function escapeHtml(txt) {
    return String(txt || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function cilindradaMoto(movil) {
    const modelo = normalizar(movil?.modelo || "");
    if (modelo.includes("250")) return "(250cc.)";
    if (modelo.includes("300")) return "(300cc.)";
    if (modelo.includes("400")) return "(400cc.)";
    if (modelo.includes("650")) return "(650cc.)";
    return "";
  }

  function lockDe(numero) {
    return estado.locks.get(normalizarNumero(numero)) || null;
  }

  function lockEsPropio(lock) {
    return !!lock && limpiar(lock.owner_id) === estado.ownerId;
  }

  function movilVisible(movil) {
    return !!movil?.numero && (movil.condicion !== false || !!lockDe(movil.numero));
  }

  function ordenarNumero(a, b) {
    return String(a?.numero || "").localeCompare(String(b?.numero || ""), "es", { numeric: true });
  }

  function grupoHtml(titulo, moviles, tipo) {
    if (!moviles.length) return "";

    return `
      <div class="control-moviles-grupo control-moviles-grupo-${tipo}">
        <div class="control-moviles-grupo-titulo">${escapeHtml(titulo)}</div>
        <div class="control-moviles-grupo-grid">
          ${moviles.map((movil) => {
            const numero = normalizarNumero(movil.numero);
            const lock = lockDe(numero);
            const controlado = !!lock;
            const bloqueado = controlado && !lockEsPropio(lock);
            const cc = tipo === "motos" ? cilindradaMoto(movil) : "";
            const clases = ["control-movil-chip"];
            if (controlado) clases.push("control-movil-chip-controlado");
            if (bloqueado) clases.push("control-movil-chip-bloqueado");
            if (movil.condicion === false) clases.push("control-movil-chip-fuera-servicio");
            const candado = bloqueado ? ' <span class="control-movil-candado" aria-hidden="true">🔒</span>' : "";
            const tituloBtn = bloqueado
              ? "Móvil controlado por otro usuario. Bloqueado hasta que ese controlador presione Salir."
              : controlado
                ? "Móvil controlado por esta sesión. Puede volver a editarlo."
                : "Seleccionar móvil";

            return `<button type="button" class="${clases.join(" ")}" data-control-movil-numero="${escapeHtml(numero)}" ${bloqueado ? "disabled" : ""} title="${escapeHtml(tituloBtn)}">${escapeHtml(numero)}${cc ? ` <small>${escapeHtml(cc)}</small>` : ""}${candado}</button>`;
          }).join("")}
        </div>
      </div>`;
  }

  function renderLista({ conservarMensaje = false } = {}) {
    const r = refs();
    if (!r.chips) return;

    const visibles = (Array.isArray(estado.moviles) ? estado.moviles : []).filter(movilVisible);
    const base = visibles
      .filter((m) => BASE_NUMEROS.includes(normalizarNumero(m.numero)))
      .sort((a, b) => BASE_NUMEROS.indexOf(normalizarNumero(a.numero)) - BASE_NUMEROS.indexOf(normalizarNumero(b.numero)));
    const motos = visibles
      .filter((m) => normalizar(m.tipo) === "MOTO")
      .sort(ordenarNumero);

    r.chips.innerHTML = grupoHtml("Móviles", base, "base") + grupoHtml("Motos", motos, "motos");

    if (!conservarMensaje) {
      setTextoEstado(visibles.length ? "Seleccione un móvil en servicio." : "No hay móviles en servicio para controlar.");
    }
  }

  function actualizarBotonSalir() {
    const r = refs();

    if (r.salir) {
      r.salir.classList.toggle("hidden", !estado.activa || !!estado.seleccionado);
      r.salir.disabled = false;
      if (!r.salir.textContent || normalizar(r.salir.textContent) === "SALIENDO...") r.salir.textContent = "Salir";
    }

    // Si alguna versión antigua todavía tiene btnEnviar, no se usa como
    // segundo botón dentro de Control de móviles.
    if (estado.activa && r.btnEnviar) {
      r.btnEnviar.style.display = "none";
    }
  }

  function mostrarLista({ conservarMensaje = false } = {}) {
    const r = refs();
    estado.seleccionado = null;
    document.body.classList.add("modo-control-moviles");
    document.body.classList.remove("control-movil-seleccionado-activo");

    if (r.chips) {
      r.chips.classList.remove("hidden");
      r.chips.style.display = "grid";
    }
    if (r.form) {
      r.form.classList.add("hidden");
      r.form.style.display = "none";
    }
    if (r.fuera) {
      r.fuera.checked = false;
      r.fuera.disabled = true;
    }

    limpiarFotos();
    renderLista({ conservarMensaje });
    actualizarBotonSalir();
  }

  function limpiarFotos() {
    const r = refs();
    [r.foto1, r.foto2].forEach((input) => {
      if (input) input.value = "";
    });
    [r.preview1, r.preview2].forEach((img) => {
      if (!img) return;
      img.src = "";
      img.classList.add("hidden");
    });
  }

  function cargarDatosFormulario(movil) {
    const r = refs();
    if (r.numero) r.numero.textContent = movil.numero || "---";
    if (r.km) r.km.value = movil.kilometraje ?? "";
    if (r.combustible) r.combustible.value = limpiar(movil.combustible).toLowerCase();
    if (r.obs) r.obs.value = movil.observaciones_novedades || movil.observaciones || "";
    if (r.fuera) {
      r.fuera.disabled = false;
      r.fuera.checked = movil.condicion === false;
    }
    if (r.guardar) {
      r.guardar.disabled = false;
      r.guardar.classList.remove("guardando");
      r.guardar.textContent = "Guardar";
    }
    limpiarFotos();
  }

  async function seleccionarMovil(numero) {
    const numeroNormalizado = normalizarNumero(numero);
    if (!numeroNormalizado) return;

    try {
      await refrescarBloqueos();
    } catch (_) {}

    const lock = lockDe(numeroNormalizado);
    if (lock && !lockEsPropio(lock)) {
      setTextoEstado(`El móvil ${numeroNormalizado} está bloqueado por otro usuario.`);
      renderLista({ conservarMensaje: true });
      return;
    }

    try {
      await cargarPadron();
    } catch (_) {}

    const movil = estado.moviles.find((m) => normalizarNumero(m.numero) === numeroNormalizado);
    if (!movil) return;

    const r = refs();
    estado.seleccionado = movil;
    document.body.classList.add("modo-control-moviles", "control-movil-seleccionado-activo");

    if (r.chips) {
      r.chips.classList.add("hidden");
      r.chips.style.display = "none";
    }
    if (r.form) {
      r.form.classList.remove("hidden");
      r.form.style.display = "grid";
    }

    cargarDatosFormulario(movil);
    actualizarBotonSalir();
    setTextoEstado("Complete kilometraje, combustible, observaciones y fotos si corresponde.");

    window.setTimeout(() => refs().km?.focus?.(), 60);
  }

  function preview(input, img) {
    if (!input || !img) return;
    const file = input.files?.[0];
    if (!file || !String(file.type || "").toLowerCase().startsWith("image/")) {
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

  async function obtenerApi() {
    if (estado.api) return estado.api;
    estado.api = await import(new URL("api/app-api.js", document.baseURI).href);
    return estado.api;
  }

  async function cargarPadron() {
    const api = await obtenerApi();
    if (typeof api.diagnosticarPadronMovilesWspSoloLectura !== "function") {
      throw new Error("La API del padrón WSP no está disponible.");
    }

    const diagnostico = await api.diagnosticarPadronMovilesWspSoloLectura();
    const moviles = Array.isArray(diagnostico?.moviles) ? diagnostico.moviles : [];
    if (!diagnostico?.ok || !moviles.length) throw new Error("El padrón WSP respondió sin móviles activos.");

    estado.moviles = moviles.map((m) => ({
      ...m,
      numero: normalizarNumero(m.numero),
      condicion: m.condicion !== false,
      activo: m.activo !== false,
    })).filter((m) => !!m.numero);
    estado.padronOk = true;
    return estado.moviles;
  }

  async function refrescarBloqueos() {
    const api = await obtenerApi();
    if (typeof api.listarBloqueosControlMovilesWsp !== "function") return [];

    const locks = await api.listarBloqueosControlMovilesWsp();
    estado.locks = new Map();
    (Array.isArray(locks) ? locks : []).forEach((lock) => {
      if (lock?.numero) estado.locks.set(normalizarNumero(lock.numero), lock);
    });

    if (estado.seleccionado?.numero) {
      const lock = lockDe(estado.seleccionado.numero);
      if (lock && !lockEsPropio(lock)) {
        const numeroBloqueado = estado.seleccionado.numero;
        mostrarLista();
        setTextoEstado(`El móvil ${numeroBloqueado} quedó bloqueado por otro usuario.`);
      }
    }

    return locks;
  }

  async function refrescarCompartido() {
    if (!estado.activa || estado.sincronizando) return;
    estado.sincronizando = true;
    try {
      await Promise.allSettled([cargarPadron(), refrescarBloqueos()]);
      if (!estado.seleccionado) renderLista();
    } finally {
      estado.sincronizando = false;
    }
  }

  function programarRefrescoCompartido() {
    if (estado.refrescoTimer) clearTimeout(estado.refrescoTimer);
    estado.refrescoTimer = setTimeout(() => {
      estado.refrescoTimer = null;
      refrescarCompartido().catch((e) => console.warn("[Control_Moviles] Refresco Realtime falló.", e));
    }, 80);
  }

  async function iniciarCoordinacionCompartida() {
    if (estado.sincronizando) return;
    estado.sincronizando = true;
    try {
      const api = await obtenerApi();
      await api.limpiarVencidosControlMovilesWsp?.();
      await api.registrarPresenciaControlMovilesWsp?.({ ownerId: estado.ownerId, sessionId: estado.sessionId });
      await Promise.all([cargarPadron(), refrescarBloqueos()]);

      if (!estado.realtime && typeof api.suscribirControlMovilesWsp === "function") {
        estado.realtime = api.suscribirControlMovilesWsp({ onCambio: programarRefrescoCompartido });
      }

      if (!estado.heartbeat) {
        estado.heartbeat = setInterval(() => {
          if (!estado.activa) return;
          api.registrarPresenciaControlMovilesWsp?.({ ownerId: estado.ownerId, sessionId: estado.sessionId })
            .catch((e) => console.warn("[Control_Moviles] Heartbeat falló.", e));
        }, HEARTBEAT_MS);
      }

      renderLista();
    } catch (error) {
      console.error("[Control_Moviles] No se pudo iniciar coordinación compartida.", error);
      setTextoEstado(`No se pudo sincronizar el control compartido: ${String(error?.message || error)}`);
    } finally {
      estado.sincronizando = false;
    }
  }

  async function detenerCoordinacionCompartida({ liberarLocks = true } = {}) {
    if (estado.heartbeat) {
      clearInterval(estado.heartbeat);
      estado.heartbeat = null;
    }
    if (estado.refrescoTimer) {
      clearTimeout(estado.refrescoTimer);
      estado.refrescoTimer = null;
    }

    try {
      const api = await obtenerApi();
      if (estado.realtime && typeof api.detenerSuscripcionControlMovilesWsp === "function") {
        await api.detenerSuscripcionControlMovilesWsp(estado.realtime);
      }
      estado.realtime = null;

      if (liberarLocks && typeof api.cerrarSesionControlMovilesWsp === "function") {
        await api.cerrarSesionControlMovilesWsp({ ownerId: estado.ownerId, sessionId: estado.sessionId });
      } else if (typeof api.borrarPresenciaPropiaControlMovilesWsp === "function") {
        await api.borrarPresenciaPropiaControlMovilesWsp({ sessionId: estado.sessionId });
      }
    } catch (error) {
      console.warn("[Control_Moviles] No se pudo cerrar limpiamente la coordinación compartida.", error);
    }

    estado.locks = new Map();
  }

  async function guardarActual() {
    const r = refs();
    const movil = estado.seleccionado;
    if (!movil) return;

    const kilometraje = limpiar(r.km?.value || "").replace(/\D+/g, "");
    const combustible = limpiar(r.combustible?.value || "").toLowerCase();
    const observaciones = limpiar(r.obs?.value || "");
    const fueraServicio = !!r.fuera?.checked;

    if (!kilometraje) {
      setTextoEstado("Complete el kilometraje. Solo se aceptan números.");
      r.km?.focus?.();
      return;
    }

    if (!combustible) {
      setTextoEstado("Seleccione un combustible válido.");
      r.combustible?.focus?.();
      return;
    }

    const lockActual = lockDe(movil.numero);
    if (lockActual && !lockEsPropio(lockActual)) {
      mostrarLista();
      setTextoEstado(`El móvil ${movil.numero} fue bloqueado por otro usuario.`);
      return;
    }

    if (r.guardar) {
      r.guardar.disabled = true;
      r.guardar.classList.add("guardando");
      r.guardar.textContent = "Guardando...";
    }
    setTextoEstado("Guardando control...");

    const datos = {
      numero: movil.numero,
      movilId: movil.id || "",
      kilometraje,
      combustible,
      observaciones,
      fueraServicio,
      fechaControl: new Date().toISOString(),
      fotos: {
        foto1: r.foto1?.files?.[0] || null,
        foto2: r.foto2?.files?.[0] || null,
      },
    };

    try {
      const persistencia = await import(new URL("api/persistencia-api.js", document.baseURI).href);
      const resultado = await persistencia.persistirEnvio({ modo: "CONTROL_MOVILES", payload: datos });
      if (!resultado?.ok) throw new Error(resultado?.mensaje || "No se pudo guardar el control.");

      const api = await obtenerApi();
      let lock = null;
      try {
        lock = await api.guardarBloqueoControlMovilWsp?.({
          numero: movil.numero,
          ownerId: estado.ownerId,
          sessionId: estado.sessionId,
        });
      } catch (errorLock) {
        console.warn("[Control_Moviles] Control guardado, pero falló el lock amarillo.", errorLock);
      }
      if (lock?.numero) estado.locks.set(normalizarNumero(lock.numero), lock);

      await Promise.allSettled([cargarPadron(), refrescarBloqueos()]);
      mostrarLista({ conservarMensaje: true });
      setTextoEstado("Control guardado. Seleccione otro móvil o presione Salir.");
    } catch (error) {
      console.error("[Control_Moviles] Error al guardar control WSP/BMZCN.", error);
      setTextoEstado(`No se pudo guardar: ${String(error?.message || error || "Error desconocido")}`);
    } finally {
      if (r.guardar) {
        r.guardar.disabled = false;
        r.guardar.classList.remove("guardando");
        r.guardar.textContent = "Guardar";
      }
      actualizarBotonSalir();
    }
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
    event?.preventDefault?.();
    event?.stopPropagation?.();
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
    const op = Array.from(selector.options || []).find((o) => normalizar(o.textContent || o.value) === "INICIA");
    if (!op) return;
    selector.value = op.value;
    selector.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function salirControlMoviles() {
    if (estado.seleccionado) {
      mostrarLista();
      return;
    }

    const r = refs();
    if (r.salir) {
      r.salir.disabled = true;
      r.salir.textContent = "Saliendo...";
    }

    await detenerCoordinacionCompartida({ liberarLocks: true });
    desactivarVisual();
    elegirIniciaEnSelector();
  }

  function desactivarVisual() {
    const r = refs();
    estado.activa = false;
    estado.seleccionado = null;
    if (r.bloque) r.bloque.classList.add("hidden");
    if (r.form) r.form.classList.add("hidden");
    if (r.chips) r.chips.classList.remove("hidden");
    if (r.fuera) {
      r.fuera.checked = false;
      r.fuera.disabled = true;
    }
    cerrarAyuda();
    document.body.classList.remove("modo-control-moviles", "control-movil-seleccionado-activo");
    if (r.btnEnviar) r.btnEnviar.style.display = "";
    actualizarBotonSalir();
  }

  function setActiva(activa) {
    const r = refs();
    const nueva = !!activa;
    if (nueva === estado.activa && nueva) {
      mostrarLista();
      return;
    }

    estado.activa = nueva;
    if (r.bloque) r.bloque.classList.toggle("hidden", !nueva);

    if (!nueva) {
      detenerCoordinacionCompartida({ liberarLocks: true }).catch(() => {});
      desactivarVisual();
      return;
    }

    document.body.classList.add("modo-control-moviles");
    mostrarLista({ conservarMensaje: true });
    setTextoEstado("Cargando móviles en servicio...");
    iniciarCoordinacionCompartida();
  }

  function bindUnaVez() {
    if (document.body.dataset.boundControlMovilesWspBehavior === "1") return;
    document.body.dataset.boundControlMovilesWspBehavior = "1";

    document.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-control-movil-numero]");
      if (!chip || chip.disabled) return;
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

    document.addEventListener("submit", (event) => {
      if (event.target?.id !== "controlMovilesFormulario") return;
      event.preventDefault();
      event.stopPropagation();
      guardarActual();
    }, true);

    document.addEventListener("change", (event) => {
      const r = refs();
      if (event.target === r.foto1) preview(r.foto1, r.preview1);
      if (event.target === r.foto2) preview(r.foto2, r.preview2);
    });

    document.addEventListener("click", (event) => {
      const r = refs();
      if (!r.salir || !event.target.closest("#controlMovilesSalir")) return;
      if (!estado.activa || estado.seleccionado) return;
      event.preventDefault();
      event.stopPropagation();
      salirControlMoviles();
    }, true);
  }

  async function cargarHtmlSiFalta(mount) {
    if ($("bloqueControlMoviles")) return;
    const resp = await fetch(new URL(`frontend/compatibilidad/control-moviles/control-moviles.html?v=${VERSION}`, document.baseURI).href, { cache: "default" });
    if (!resp.ok) throw new Error(`No se pudo cargar Control de móviles: HTTP ${resp.status}`);
    const html = await resp.text();
    (mount || document.body).insertAdjacentHTML("beforeend", html);
  }

  async function init(config = {}) {
    const mount = typeof config.mount === "string" ? document.querySelector(config.mount) : config.mount;
    await cargarHtmlSiFalta(mount || document.body);
    refs();
    bindUnaVez();
    if (estado.refs.fuera) estado.refs.fuera.disabled = true;
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
    refrescar: refrescarCompartido,
  };

  console.log("[Control_Moviles] cargado", VERSION);
})();
