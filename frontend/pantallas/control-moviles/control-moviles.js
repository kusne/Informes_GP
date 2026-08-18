// Control_Moviles/control-moviles.js - interfaz original + comportamiento compartido WSP
(function () {
  "use strict";

  window.WSP = window.WSP || {};
  window.WSP.modules = window.WSP.modules || {};

  const VERSION = "control-moviles-wsp-shared-20260817-1";

  // Proyecto central de móviles WSP/BMZCN.
  const SUPABASE_URL = "https://ugeydxozfewzhldjbkat.supabase.co";
  const SUPABASE_KEY = "sb_publishable_ZeLC2rOxhhUXlQdvJ28JkA_qf802-pX";
  const TABLA_MOVILES = "moviles_bmzcn";
  const TABLA_CONTROLES = "moviles_controles";
  const TABLA_FOTOS = "moviles_fotos_guardia";
  const TABLA_ESTADO = "recursos_controles_wsp_estado";
  const TABLA_LOCKS = "wsp_control_moviles_locks";
  const TABLA_PRESENCE = "wsp_control_moviles_presence";
  const BUCKET_FOTOS = "moviles-control-fotos";
  const FUENTE = "INFORMES_GP";

  const BASE_NUMEROS = ["12428", "10139", "12502"];
  const HEARTBEAT_MS = 15000;
  const PRESENCE_TTL_MS = 45000;
  const LOCK_TTL_MS = 2 * 60 * 60 * 1000;
  const ESTADO_TTL_MS = 2 * 60 * 60 * 1000;
  const COMBUSTIBLES = ["", "reserva", "1/4", "+1/4", "-1/2", "1/2", "+1/2", "3/4", "+3/4", "lleno"];

  const estado = {
    activa: false,
    seleccionado: null,
    moviles: [],
    locks: new Map(),
    refs: {},
    realtimeClient: null,
    realtimeChannel: null,
    heartbeat: null,
    refrescoRealtime: null,
    iniciando: false,
    ownerId: obtenerIdSesion("igp_control_moviles_owner_id", "owner"),
    sessionId: obtenerIdSesion("igp_control_moviles_session_id", "session"),
  };

  function $(id) { return document.getElementById(id); }

  function limpiar(txt) { return String(txt ?? "").replace(/\s+/g, " ").trim(); }

  function normalizar(txt) {
    return limpiar(txt)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  }

  function normalizarNumero(valor) { return limpiar(valor).replace(/\D+/g, ""); }

  function normalizarCombustible(valor) {
    const v = limpiar(valor).toLowerCase();
    return COMBUSTIBLES.includes(v) ? v : "";
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

  function ahoraISO(offsetMs = 0) { return new Date(Date.now() + offsetMs).toISOString(); }

  function obtenerGuardiaControlMovil(fecha = new Date()) {
    const local = new Date(fecha);
    if (local.getHours() < 6) local.setDate(local.getDate() - 1);
    local.setHours(6, 0, 0, 0);
    const fin = new Date(local);
    fin.setDate(fin.getDate() + 1);
    const yyyy = local.getFullYear();
    const mm = String(local.getMonth() + 1).padStart(2, "0");
    const dd = String(local.getDate()).padStart(2, "0");
    return {
      guardia_fecha: `${yyyy}-${mm}-${dd}`,
      guardia_inicio: local.toISOString(),
      guardia_fin: fin.toISOString(),
    };
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

  function escapeHtml(txt) {
    return String(txt ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function headers(extra = {}) {
    return {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      ...extra,
    };
  }

  function queryString(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
    });
    const s = q.toString();
    return s ? `?${s}` : "";
  }

  async function rest(tabla, { method = "GET", params = {}, body, prefer = "", accept = "application/json" } = {}) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}${queryString(params)}`, {
      method,
      headers: headers({
        Accept: accept,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(prefer ? { Prefer: prefer } : {}),
      }),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const texto = await response.text().catch(() => "");
      throw new Error(`${tabla}: HTTP ${response.status}${texto ? ` - ${texto}` : ""}`);
    }

    if (response.status === 204 || prefer.includes("return=minimal")) return null;
    const text = await response.text().catch(() => "");
    if (!text) return null;
    try { return JSON.parse(text); } catch (_) { return text; }
  }

  function normalizarMovil(row = {}) {
    return {
      id: row.id || null,
      numero: normalizarNumero(row.numero),
      tipo: limpiar(row.tipo || row.categoria || "").toUpperCase(),
      modelo: limpiar(row.modelo || ""),
      dominio: limpiar(row.dominio || "").toUpperCase(),
      kilometraje: String(row.kilometraje ?? "").replace(/\D+/g, ""),
      combustible: normalizarCombustible(row.combustible),
      observaciones_novedades: limpiar(row.observaciones_novedades ?? row.observaciones ?? ""),
      condicion: row.condicion === true || String(row.condicion).toLowerCase() === "true",
      activo: row.activo !== false && String(row.activo).toLowerCase() !== "false",
    };
  }

  function normalizarLock(row = {}) {
    const numero = normalizarNumero(row.numero_movil ?? row.numero);
    if (!numero) return null;
    return {
      numero,
      guardia_fecha: limpiar(row.guardia_fecha),
      owner_id: limpiar(row.owner_id),
      session_id: limpiar(row.session_id),
      locked_at: limpiar(row.locked_at),
      updated_at: limpiar(row.updated_at),
      expires_at: limpiar(row.expires_at),
    };
  }

  function lockDe(numero) { return estado.locks.get(normalizarNumero(numero)) || null; }
  function lockEsPropio(lock) { return !!lock && lock.owner_id === estado.ownerId; }

  function cilindradaMoto(movil) {
    const modelo = normalizar(movil?.modelo || "");
    if (modelo.includes("250")) return "(250cc.)";
    if (modelo.includes("300")) return "(300cc.)";
    if (modelo.includes("650")) return "(650cc.)";
    if (modelo.includes("400")) return "(400cc.)";
    return "";
  }

  function prioridadModeloMoto(movil) {
    const m = normalizar(movil?.modelo || "");
    if (m.includes("250")) return 1;
    if (m.includes("300")) return 2;
    if (m.includes("650")) return 3;
    if (m.includes("400")) return 4;
    return 9;
  }

  function ordenarMotos(a, b) {
    const pa = prioridadModeloMoto(a);
    const pb = prioridadModeloMoto(b);
    if (pa !== pb) return pa - pb;
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
            const title = bloqueado
              ? "Móvil bloqueado por otro controlador hasta que presione Salir."
              : controlado
                ? "Móvil controlado por esta sesión. Puede volver a editarlo."
                : "Seleccionar móvil";
            return `<button type="button" class="${clases.join(" ")}" data-control-movil-numero="${escapeHtml(numero)}" ${bloqueado ? "disabled" : ""} title="${escapeHtml(title)}">${escapeHtml(numero)}${cc ? ` <small>${escapeHtml(cc)}</small>` : ""}${candado}</button>`;
          }).join("")}
        </div>
      </div>`;
  }

  function movilesVisibles() {
    return estado.moviles.filter((m) => m?.activo !== false && (m?.condicion !== false || !!lockDe(m.numero)));
  }

  function renderLista({ conservarMensaje = false } = {}) {
    const r = refs();
    if (!r.chips) return;

    const visibles = movilesVisibles();
    const movilesBase = visibles
      .filter((m) => BASE_NUMEROS.includes(normalizarNumero(m.numero)))
      .sort((a, b) => BASE_NUMEROS.indexOf(normalizarNumero(a.numero)) - BASE_NUMEROS.indexOf(normalizarNumero(b.numero)));
    const motos = visibles
      .filter((m) => normalizar(m.tipo) === "MOTO")
      .sort(ordenarMotos);

    r.chips.innerHTML = grupoHtml("Móviles", movilesBase, "base") + grupoHtml("Motos", motos, "motos");
    if (!conservarMensaje) {
      setTextoEstado(visibles.length ? "Seleccione un móvil en servicio." : "No hay móviles en servicio para controlar.");
    }
  }

  function limpiarFotos() {
    const r = refs();
    if (r.foto1) r.foto1.value = "";
    if (r.foto2) r.foto2.value = "";
    if (r.preview1) { r.preview1.src = ""; r.preview1.classList.add("hidden"); }
    if (r.preview2) { r.preview2.src = ""; r.preview2.classList.add("hidden"); }
  }

  function mostrarLista({ conservarMensaje = false } = {}) {
    const r = refs();
    estado.seleccionado = null;
    document.body.classList.add("modo-control-moviles");
    document.body.classList.remove("control-movil-seleccionado-activo");

    if (r.chips) { r.chips.classList.remove("hidden"); r.chips.style.display = "grid"; }
    if (r.form) { r.form.classList.add("hidden"); r.form.style.display = "none"; }
    if (r.fuera) { r.fuera.checked = false; r.fuera.disabled = true; }

    limpiarFotos();
    renderLista({ conservarMensaje });

    if (r.btnEnviar) {
      r.btnEnviar.classList.remove("hidden");
      r.btnEnviar.style.display = "block";
      r.btnEnviar.disabled = false;
      r.btnEnviar.textContent = "Salir";
    }
  }

  function cargarDatosFormulario(movil) {
    const r = refs();
    if (r.numero) r.numero.textContent = movil.numero;
    if (r.km) r.km.value = movil.kilometraje || "";
    if (r.combustible) r.combustible.value = movil.combustible || "";
    if (r.obs) r.obs.value = movil.observaciones_novedades || "";
    if (r.fuera) { r.fuera.disabled = false; r.fuera.checked = movil.condicion === false; }
    if (r.guardar) { r.guardar.disabled = false; r.guardar.classList.remove("guardando"); r.guardar.textContent = "Guardar"; }
    limpiarFotos();
  }

  async function seleccionarMovil(numero) {
    const n = normalizarNumero(numero);
    const lock = lockDe(n);
    if (lock && !lockEsPropio(lock)) {
      setTextoEstado(`El móvil ${n} está bloqueado por otro controlador.`);
      return;
    }

    let movil = estado.moviles.find((m) => normalizarNumero(m.numero) === n);
    if (!movil) return;

    const r = refs();
    estado.seleccionado = movil;
    document.body.classList.add("modo-control-moviles", "control-movil-seleccionado-activo");
    if (r.chips) { r.chips.classList.add("hidden"); r.chips.style.display = "none"; }
    if (r.form) { r.form.classList.remove("hidden"); r.form.style.display = "grid"; }
    if (r.btnEnviar) r.btnEnviar.style.display = "none";

    cargarDatosFormulario(movil);
    setTextoEstado("Leyendo último estado del móvil...");

    try {
      const filas = await rest(TABLA_MOVILES, {
        params: {
          select: "id,numero,tipo,modelo,dominio,kilometraje,combustible,observaciones_novedades,condicion,activo",
          numero: `eq.${Number(n)}`,
          limit: 1,
        },
      });
      if (Array.isArray(filas) && filas[0]) {
        const actualizado = normalizarMovil(filas[0]);
        estado.moviles = estado.moviles.map((m) => normalizarNumero(m.numero) === n ? actualizado : m);
        movil = actualizado;
        estado.seleccionado = actualizado;
        cargarDatosFormulario(actualizado);
      }
      setTextoEstado("Complete kilometraje, combustible, observaciones y fotos si corresponde.");
    } catch (error) {
      console.warn("[Control_Moviles] No se pudo refrescar el móvil seleccionado.", error);
      setTextoEstado("Complete kilometraje, combustible, observaciones y fotos si corresponde.");
    }

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

  async function cargarPadron() {
    const data = await rest(TABLA_MOVILES, {
      params: {
        select: "id,numero,tipo,modelo,dominio,kilometraje,combustible,observaciones_novedades,condicion,activo",
        activo: "eq.true",
        order: "numero.asc",
      },
    });
    estado.moviles = (Array.isArray(data) ? data : []).map(normalizarMovil).filter((m) => m.numero);
    return estado.moviles;
  }

  async function cargarLocks() {
    const guardia = obtenerGuardiaControlMovil();
    const data = await rest(TABLA_LOCKS, {
      params: {
        select: "numero_movil,guardia_fecha,owner_id,session_id,locked_at,updated_at,expires_at",
        guardia_fecha: `eq.${guardia.guardia_fecha}`,
        expires_at: `gt.${ahoraISO()}`,
      },
    });

    const mapa = new Map();
    (Array.isArray(data) ? data : []).forEach((row) => {
      const lock = normalizarLock(row);
      if (lock) mapa.set(lock.numero, lock);
    });
    estado.locks = mapa;

    if (estado.seleccionado?.numero) {
      const lock = lockDe(estado.seleccionado.numero);
      if (lock && !lockEsPropio(lock)) {
        const n = estado.seleccionado.numero;
        mostrarLista({ conservarMensaje: true });
        setTextoEstado(`El móvil ${n} quedó bloqueado por otro controlador.`);
      }
    }
    return mapa;
  }

  async function limpiarVencidos() {
    await Promise.allSettled([
      rest(TABLA_LOCKS, { method: "DELETE", params: { expires_at: `lt.${ahoraISO()}` }, prefer: "return=minimal" }),
      rest(TABLA_PRESENCE, { method: "DELETE", params: { expires_at: `lt.${ahoraISO()}` }, prefer: "return=minimal" }),
    ]);
  }

  async function registrarPresencia() {
    const guardia = obtenerGuardiaControlMovil();
    const now = ahoraISO();
    await rest(TABLA_PRESENCE, {
      method: "POST",
      params: { on_conflict: "session_id" },
      body: {
        owner_id: estado.ownerId,
        session_id: estado.sessionId,
        guardia_fecha: guardia.guardia_fecha,
        entered_at: now,
        heartbeat_at: now,
        expires_at: ahoraISO(PRESENCE_TTL_MS),
      },
      prefer: "resolution=merge-duplicates,return=minimal",
    });
  }

  async function borrarPresenciaPropia({ keepalive = false } = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${TABLA_PRESENCE}${queryString({ session_id: `eq.${estado.sessionId}` })}`;
    if (keepalive) {
      try {
        fetch(url, { method: "DELETE", headers: headers({ Prefer: "return=minimal" }), keepalive: true });
      } catch (_) {}
      return;
    }
    await rest(TABLA_PRESENCE, { method: "DELETE", params: { session_id: `eq.${estado.sessionId}` }, prefer: "return=minimal" });
  }

  async function guardarLock(numero) {
    const guardia = obtenerGuardiaControlMovil();
    const now = ahoraISO();
    const payload = {
      numero_movil: normalizarNumero(numero),
      guardia_fecha: guardia.guardia_fecha,
      owner_id: estado.ownerId,
      session_id: estado.sessionId,
      locked_at: now,
      updated_at: now,
      expires_at: ahoraISO(LOCK_TTL_MS),
    };
    await rest(TABLA_LOCKS, {
      method: "POST",
      params: { on_conflict: "guardia_fecha,numero_movil" },
      body: payload,
      prefer: "resolution=merge-duplicates,return=representation",
    });
    const lock = normalizarLock(payload);
    if (lock) estado.locks.set(lock.numero, lock);
    return lock;
  }

  async function liberarLocksPropios({ keepalive = false } = {}) {
    const guardia = obtenerGuardiaControlMovil();
    const params = {
      guardia_fecha: `eq.${guardia.guardia_fecha}`,
      owner_id: `eq.${estado.ownerId}`,
      session_id: `eq.${estado.sessionId}`,
    };
    const url = `${SUPABASE_URL}/rest/v1/${TABLA_LOCKS}${queryString(params)}`;
    if (keepalive) {
      try { fetch(url, { method: "DELETE", headers: headers({ Prefer: "return=minimal" }), keepalive: true }); } catch (_) {}
      return;
    }
    await rest(TABLA_LOCKS, { method: "DELETE", params, prefer: "return=minimal" });
    estado.locks = new Map(Array.from(estado.locks.entries()).filter(([, lock]) => !lockEsPropio(lock)));
  }

  function asegurarSupabaseRealtime() {
    if (window.__igpSupabaseRealtimePromise) return window.__igpSupabaseRealtimePromise;
    window.__igpSupabaseRealtimePromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    return window.__igpSupabaseRealtimePromise;
  }

  async function iniciarRealtime() {
    if (estado.realtimeChannel) return true;
    try {
      const sb = await asegurarSupabaseRealtime();
      if (typeof sb?.createClient !== "function") throw new Error("Supabase Realtime no quedó disponible.");
      estado.realtimeClient = sb.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const guardia = obtenerGuardiaControlMovil();
      estado.realtimeChannel = estado.realtimeClient
        .channel(`igp-control-moviles-${guardia.guardia_fecha}-${estado.sessionId}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: TABLA_LOCKS,
          filter: `guardia_fecha=eq.${guardia.guardia_fecha}`,
        }, () => programarRefrescoRealtime())
        .subscribe();
      return true;
    } catch (error) {
      console.warn("[Control_Moviles] Realtime no disponible.", error);
      return false;
    }
  }

  function detenerRealtime() {
    if (estado.refrescoRealtime) {
      clearTimeout(estado.refrescoRealtime);
      estado.refrescoRealtime = null;
    }
    if (estado.realtimeChannel && estado.realtimeClient) {
      try { estado.realtimeClient.removeChannel(estado.realtimeChannel); } catch (_) {}
    }
    estado.realtimeChannel = null;
    estado.realtimeClient = null;
  }

  function programarRefrescoRealtime() {
    if (estado.refrescoRealtime) clearTimeout(estado.refrescoRealtime);
    estado.refrescoRealtime = setTimeout(async () => {
      estado.refrescoRealtime = null;
      if (!estado.activa) return;
      try {
        await cargarLocks();
        if (!estado.seleccionado) renderLista();
      } catch (error) {
        console.warn("[Control_Moviles] No se pudo refrescar locks por Realtime.", error);
      }
    }, 120);
  }

  function iniciarHeartbeat() {
    detenerHeartbeat();
    estado.heartbeat = setInterval(() => {
      if (!estado.activa) return;
      registrarPresencia().catch((error) => console.warn("[Control_Moviles] Heartbeat falló.", error));
    }, HEARTBEAT_MS);
  }

  function detenerHeartbeat() {
    if (estado.heartbeat) clearInterval(estado.heartbeat);
    estado.heartbeat = null;
  }

  async function iniciarCompartido() {
    if (estado.iniciando) return;
    estado.iniciando = true;
    try {
      setTextoEstado("Cargando móviles en servicio...");
      await limpiarVencidos();
      await registrarPresencia();
      await Promise.all([cargarPadron(), cargarLocks()]);
      await iniciarRealtime();
      iniciarHeartbeat();
      renderLista();
    } catch (error) {
      console.error("[Control_Moviles] No se pudo iniciar control compartido.", error);
      setTextoEstado(`No se pudo cargar Control de móviles: ${String(error?.message || error)}`);
    } finally {
      estado.iniciando = false;
    }
  }

  async function detenerCompartido({ liberar = true, keepalive = false } = {}) {
    detenerHeartbeat();
    detenerRealtime();
    const tareas = [borrarPresenciaPropia({ keepalive })];
    if (liberar) tareas.push(liberarLocksPropios({ keepalive }));
    if (keepalive) return;
    await Promise.allSettled(tareas);
    estado.locks = new Map();
  }

  async function subirArchivo(file, numero, slot) {
    if (!file) return null;
    const guardia = obtenerGuardiaControlMovil();
    const ext = (String(file.name || "").match(/\.([a-z0-9]{2,5})$/i)?.[1] || (String(file.type || "").startsWith("video/") ? "mp4" : "jpg")).toLowerCase();
    const safeNumero = normalizarNumero(numero) || "movil";
    const path = `${guardia.guardia_fecha}/${safeNumero}/${Date.now()}_${slot}.${ext}`;
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_FOTOS}/${path}`, {
      method: "POST",
      headers: headers({
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false",
      }),
      body: file,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Foto ${slot}: HTTP ${response.status}${text ? ` - ${text}` : ""}`);
    }
    return {
      url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_FOTOS}/${path}`,
      path,
      slot,
    };
  }

  async function insertarControl(payload) {
    return rest(TABLA_CONTROLES, {
      method: "POST",
      body: payload,
      prefer: "return=representation",
    });
  }

  async function actualizarEstadoMovil(numero, kilometraje, combustible, observaciones, fueraServicio) {
    return rest(TABLA_MOVILES, {
      method: "PATCH",
      params: { numero: `eq.${Number(numero)}` },
      body: {
        kilometraje: Number(kilometraje),
        combustible,
        observaciones_novedades: observaciones,
        condicion: !fueraServicio,
      },
      prefer: "return=minimal",
    });
  }

  async function insertarFotos({ control, fotos, movil, observaciones, guardia }) {
    const validas = fotos.filter(Boolean);
    if (!validas.length) return;
    const controlRow = Array.isArray(control) ? control[0] : control;
    const payload = validas.map((foto) => ({
      control_id: controlRow?.id || null,
      movil_id: movil?.id ? String(movil.id) : null,
      numero_movil: Number(movil.numero),
      guardia_fecha: guardia.guardia_fecha,
      guardia_inicio: guardia.guardia_inicio,
      guardia_fin: guardia.guardia_fin,
      foto_url: foto.url,
      foto_path: foto.path,
      slot: foto.slot,
      fuente: FUENTE,
      observaciones,
    }));
    await rest(TABLA_FOTOS, { method: "POST", body: payload, prefer: "return=minimal" });
  }

  async function registrarMarcaBmzcn(numero, guardia) {
    const existentes = await rest(TABLA_ESTADO, {
      params: {
        select: "cantidad_controles_ventana",
        guardia_fecha: `eq.${guardia.guardia_fecha}`,
        numero_movil: `eq.${Number(numero)}`,
        limit: 1,
      },
    });
    const anterior = Number(Array.isArray(existentes) && existentes[0]?.cantidad_controles_ventana || 0);
    const cantidad = Math.max(1, anterior + 1);
    const color = cantidad >= 3 ? "NEGRA" : cantidad === 2 ? "AZUL" : "DORADA";
    const now = ahoraISO();
    await rest(TABLA_ESTADO, {
      method: "POST",
      params: { on_conflict: "guardia_fecha,numero_movil" },
      body: {
        guardia_fecha: guardia.guardia_fecha,
        numero_movil: Number(numero),
        controlado: true,
        controlado_at: now,
        expires_at: ahoraISO(ESTADO_TTL_MS),
        cantidad_controles_ventana: cantidad,
        color_marca: color,
        ultimo_session_id: estado.sessionId,
        fuente: FUENTE,
        updated_at: now,
      },
      prefer: "resolution=merge-duplicates,return=minimal",
    });
  }

  async function guardarActual() {
    const r = refs();
    const movil = estado.seleccionado;
    if (!movil) return;

    const numero = normalizarNumero(movil.numero);
    const kilometraje = limpiar(r.km?.value || "").replace(/\D+/g, "");
    const combustible = normalizarCombustible(r.combustible?.value || "");
    const observaciones = limpiar(r.obs?.value || "");
    const fueraServicio = !!r.fuera?.checked;

    if (!kilometraje) {
      alert("Complete el kilometraje. Solo se aceptan números.");
      r.km?.focus?.();
      return;
    }
    if (!COMBUSTIBLES.includes(combustible) || !combustible) {
      alert("Seleccione un combustible válido.");
      r.combustible?.focus?.();
      return;
    }

    try {
      await cargarLocks();
      const lock = lockDe(numero);
      if (lock && !lockEsPropio(lock)) {
        alert(`El móvil ${numero} ya fue controlado por otro usuario y está bloqueado.`);
        mostrarLista({ conservarMensaje: true });
        setTextoEstado("Móvil bloqueado por otro controlador. Seleccione otro móvil o presione Salir.");
        return;
      }
    } catch (_) {}

    if (r.guardar) { r.guardar.disabled = true; r.guardar.classList.add("guardando"); r.guardar.textContent = "Guardando..."; }
    setTextoEstado("Guardando móvil en servicio...");

    const guardia = obtenerGuardiaControlMovil();
    let foto1 = null;
    let foto2 = null;
    let control = null;

    try {
      try { foto1 = await subirArchivo(r.foto1?.files?.[0] || null, numero, "foto1"); }
      catch (error) { console.warn("[Control_Moviles] Foto 1 falló; el control continúa.", error); }
      try { foto2 = await subirArchivo(r.foto2?.files?.[0] || null, numero, "foto2"); }
      catch (error) { console.warn("[Control_Moviles] Foto 2 falló; el control continúa.", error); }

      control = await insertarControl({
        movil_id: movil.id || null,
        numero_movil: Number(numero),
        kilometraje: Number(kilometraje),
        combustible,
        observaciones,
        guardia_fecha: guardia.guardia_fecha,
        guardia_inicio: guardia.guardia_inicio,
        guardia_fin: guardia.guardia_fin,
        fuente: FUENTE,
      });

      await actualizarEstadoMovil(numero, kilometraje, combustible, observaciones, fueraServicio);

      try { await insertarFotos({ control, fotos: [foto1, foto2], movil, observaciones, guardia }); }
      catch (error) { console.warn("[Control_Moviles] Fotos de guardia no pudieron registrarse; el control ya quedó guardado.", error); }

      try { await registrarMarcaBmzcn(numero, guardia); }
      catch (error) { console.warn("[Control_Moviles] La marca BMZCN falló; el control principal ya quedó guardado.", error); }

      // El lock se activa DESPUÉS del guardado, igual que en WSP.
      try { await guardarLock(numero); }
      catch (error) { console.warn("[Control_Moviles] El control se guardó pero no pudo activarse el amarillo compartido.", error); }

      estado.moviles = estado.moviles.map((m) => normalizarNumero(m.numero) === numero ? {
        ...m,
        kilometraje,
        combustible,
        observaciones_novedades: observaciones,
        condicion: !fueraServicio,
      } : m);

      await Promise.allSettled([cargarPadron(), cargarLocks()]);
      mostrarLista({ conservarMensaje: true });
      setTextoEstado("Control guardado. Seleccione otro móvil o presione Salir.");
    } catch (error) {
      console.error("[Control_Moviles] Error guardando control.", error);
      alert("No se pudo guardar el control de móvil. Revisá la conexión e intentá nuevamente.");
      setTextoEstado(`No se pudo guardar: ${String(error?.message || error)}`);
    } finally {
      if (r.guardar) { r.guardar.disabled = false; r.guardar.classList.remove("guardando"); r.guardar.textContent = "Guardar"; }
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
    const op = Array.from(selector.options || []).find((o) => normalizar(o.textContent || o.value) === "INICIA") || selector.options[0];
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
    if (r.btnEnviar) { r.btnEnviar.disabled = true; r.btnEnviar.textContent = "Saliendo..."; }
    try {
      // Requisito: los móviles amarillos de ESTA sesión se liberan al presionar Salir.
      await detenerCompartido({ liberar: true });
    } catch (error) {
      console.warn("[Control_Moviles] No se pudo cerrar limpiamente.", error);
    } finally {
      if (r.btnEnviar) r.btnEnviar.disabled = false;
    }

    setActiva(false, { yaDetenido: true });
    elegirIniciaEnSelector();
  }

  function setActiva(activa, { yaDetenido = false } = {}) {
    const r = refs();
    const anterior = estado.activa;
    estado.activa = !!activa;

    if (r.bloque) r.bloque.classList.toggle("hidden", !estado.activa);
    document.body.classList.toggle("modo-control-moviles", estado.activa);

    if (!estado.activa) {
      estado.seleccionado = null;
      document.body.classList.remove("control-movil-seleccionado-activo");
      cerrarAyuda();
      if (r.form) r.form.classList.add("hidden");
      if (r.chips) r.chips.classList.remove("hidden");
      if (r.fuera) { r.fuera.checked = false; r.fuera.disabled = true; }
      if (r.btnEnviar) {
        r.btnEnviar.style.display = "";
        if (normalizar(r.btnEnviar.textContent) === "SALIR" || normalizar(r.btnEnviar.textContent) === "SALIENDO...") {
          r.btnEnviar.textContent = "Enviar por WhatsApp";
        }
      }
      if (anterior && !yaDetenido) detenerCompartido({ liberar: true }).catch(() => {});
      return;
    }

    mostrarLista();
    iniciarCompartido();
  }

  function bindUnaVez() {
    if (document.body.dataset.boundControlMovilesWspShared === "1") return;
    document.body.dataset.boundControlMovilesWspShared = "1";

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

    document.addEventListener("input", (event) => {
      const r = refs();
      if (event.target === r.km) r.km.value = String(r.km.value || "").replace(/\D+/g, "");
    });

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

    window.addEventListener("beforeunload", () => {
      if (!estado.activa) return;
      detenerHeartbeat();
      detenerRealtime();
      // El amarillo se libera por la acción Salir. Al cerrar/recargar solo
      // se retira la presencia; el lock conserva su vencimiento de seguridad.
      borrarPresenciaPropia({ keepalive: true });
    });
  }

  async function cargarHtmlSiFalta(mount) {
    if ($("bloqueControlMoviles")) return;
    try {
      const resp = await fetch(new URL(`frontend/compatibilidad/control-moviles/control-moviles.html?v=${VERSION}`, document.baseURI).href, { cache: "no-cache" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const html = await resp.text();
      (mount || document.body).insertAdjacentHTML("beforeend", html);
    } catch (error) {
      console.error("[Control_Moviles] No se pudo cargar su HTML.", error);
      throw error;
    }
  }

  async function init(config = {}) {
    const mount = typeof config.mount === "string" ? document.querySelector(config.mount) : config.mount;
    await cargarHtmlSiFalta(mount || document.body);
    refs();
    bindUnaVez();
    if (estado.refs.fuera) estado.refs.fuera.disabled = true;
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
    recargar: async () => {
      await Promise.all([cargarPadron(), cargarLocks()]);
      renderLista();
    },
  };

  console.log("[Control_Moviles] cargado", VERSION);
})();
