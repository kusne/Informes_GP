// Control de Móviles - Informes GP
// Flujo alineado al módulo WSP: mismo padrón, historial, estado actual, marca BMZCN,
// locks amarillos compartidos y liberación del bloqueo propio al salir.
(function () {
  "use strict";

  window.WSP = window.WSP || {};
  window.WSP.modules = window.WSP.modules || {};

  const VERSION = "control-moviles-wsp-paridad-20260817-2109";
  const SUPABASE_URL = "https://ugeydxozfewzhldjbkat.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_ZeLC2rOxhhUXlQdvJ28JkA_qf802-pX";

  const TABLA_MOVILES = "moviles_bmzcn";
  const TABLA_CONTROLES = "moviles_controles";
  const TABLA_FOTOS = "moviles_fotos_guardia";
  const TABLA_ESTADO = "recursos_controles_wsp_estado";
  const TABLA_LOCKS = "wsp_control_moviles_locks";
  const TABLA_PRESENCE = "wsp_control_moviles_presence";
  const BUCKET_FOTOS = "moviles-control-fotos";

  const BASE_NUMEROS = ["12428", "10139", "12502"];
  const COMBUSTIBLES = ["", "reserva", "1/4", "+1/4", "-1/2", "1/2", "+1/2", "3/4", "+3/4", "lleno"];
  const HEARTBEAT_MS = 15000;
  const PRESENCE_TTL_MS = 45000;
  const LOCK_TTL_MS = 2 * 60 * 60 * 1000;

  const estado = {
    activa: false,
    inicializado: false,
    iniciando: false,
    deteniendo: false,
    moviles: [],
    locks: new Map(),
    seleccionado: null,
    refs: {},
    firmaRender: "",
    heartbeat: null,
    realtimeClient: null,
    realtimeChannel: null,
    realtimeRefresh: null,
  };

  function $(id) { return document.getElementById(id); }
  function limpiar(v) { return String(v ?? "").replace(/\s+/g, " ").trim(); }
  function normalizarBasico(v) {
    return limpiar(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
  function normalizarNumero(v) { return limpiar(v).replace(/\D+/g, ""); }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function fechaLocalISO(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
  function fechaHoraLocalISO(d) {
    return `${fechaLocalISO(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }
  function ahoraISO(offsetMs = 0) { return new Date(Date.now() + offsetMs).toISOString(); }

  function obtenerGuardia() {
    const inicio = new Date();
    if (inicio.getHours() < 6) inicio.setDate(inicio.getDate() - 1);
    inicio.setHours(6, 0, 0, 0);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 1);
    return {
      guardia_fecha: fechaLocalISO(inicio),
      guardia_inicio: fechaHoraLocalISO(inicio),
      guardia_fin: fechaHoraLocalISO(fin),
    };
  }

  function crearId(prefijo) {
    try {
      if (window.crypto?.randomUUID) return `${prefijo}_${window.crypto.randomUUID()}`;
    } catch (_) {}
    return `${prefijo}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }

  function sessionId(key, prefijo) {
    try {
      let value = window.sessionStorage?.getItem(key);
      if (value) return value;
      value = crearId(prefijo);
      window.sessionStorage?.setItem(key, value);
      return value;
    } catch (_) {
      return crearId(prefijo);
    }
  }

  const OWNER_ID = sessionId("igp_control_moviles_owner_id", "igp_owner");
  const SESSION_ID = sessionId("igp_control_moviles_session_id", "igp_session");

  function headers(extra = {}) {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      ...extra,
    };
  }

  async function fetchTabla(tabla, { method = "GET", params = {}, body = null, extraHeaders = {}, keepalive = false } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const url = `${SUPABASE_URL}/rest/v1/${tabla}${qs.toString() ? `?${qs.toString()}` : ""}`;
    const response = await fetch(url, {
      method,
      headers: headers({
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...extraHeaders,
      }),
      body: body ? JSON.stringify(body) : null,
      keepalive,
    });
    if (!response.ok) {
      const txt = await response.text().catch(() => "");
      throw new Error(`${tabla} ${method} ${response.status}: ${txt}`);
    }
    if (method === "DELETE" || /return=minimal/i.test(extraHeaders?.Prefer || "")) return null;
    return response.json().catch(() => null);
  }

  function capturarRefs() {
    estado.refs = {
      bloqueControlMoviles: $("bloqueControlMoviles"),
      controlMovilesEstado: $("controlMovilesEstado"),
      controlMovilesChips: $("controlMovilesChips"),
      controlMovilesFormulario: $("controlMovilesFormulario"),
      controlMovilNumeroSeleccionado: $("controlMovilNumeroSeleccionado"),
      controlMovilKilometraje: $("controlMovilKilometraje"),
      controlMovilCombustible: $("controlMovilCombustible"),
      controlMovilObservaciones: $("controlMovilObservaciones"),
      controlMovilFueraServicio: $("controlMovilFueraServicio"),
      controlMovilesAyudaWrap: $("controlMovilesAyudaWrap"),
      controlMovilesAyudaBtn: $("controlMovilesAyudaBtn"),
      controlMovilesAyudaPopup: $("controlMovilesAyudaPopup"),
      controlMovilFoto1: $("controlMovilFoto1"),
      controlMovilFoto2: $("controlMovilFoto2"),
      controlMovilPreview1: $("controlMovilPreview1"),
      controlMovilPreview2: $("controlMovilPreview2"),
      btnCambiarMovilControl: $("btnCambiarMovilControl"),
      btnSalir: $("controlMovilesSalirCompat"),
    };
    return estado.refs;
  }

  function ui() { return window.WSP?.modules?.controlMovilesUi || null; }
  function setEstado(texto) {
    const r = capturarRefs();
    if (r.controlMovilesEstado) r.controlMovilesEstado.textContent = texto || "";
  }

  function normalizarCombustible(v) {
    const value = limpiar(v).toLowerCase();
    return COMBUSTIBLES.includes(value) ? value : "";
  }

  function normalizarTipo(v) {
    const t = normalizarBasico(v);
    if (t === "pick up" || t === "pickup") return "PICK UP";
    if (t === "furgon") return "FURGÓN";
    if (t === "sedan") return "SEDAN";
    if (t === "moto") return "MOTO";
    return limpiar(v).toUpperCase();
  }

  function normalizarMovil(row) {
    const condicion = row?.condicion === true || String(row?.condicion).toLowerCase() === "true";
    return {
      id: row?.id || null,
      numero: normalizarNumero(row?.numero),
      tipo: normalizarTipo(row?.tipo || row?.categoria),
      modelo: limpiar(row?.modelo),
      dominio: limpiar(row?.dominio).toUpperCase(),
      kilometraje: String(row?.kilometraje ?? "").replace(/\D+/g, ""),
      combustible: normalizarCombustible(row?.combustible),
      observaciones_novedades: limpiar(row?.observaciones_novedades ?? row?.observaciones ?? ""),
      condicion,
      activo: row?.activo !== false,
    };
  }

  function prioridadModeloMoto(m) {
    const model = normalizarBasico(m?.modelo);
    if (model.includes("250")) return 1;
    if (model.includes("300")) return 2;
    if (model.includes("650")) return 3;
    if (model.includes("400")) return 4;
    return 9;
  }

  function ordenarMoviles(a, b) {
    const ta = normalizarTipo(a?.tipo) === "MOTO" ? 4 : 1;
    const tb = normalizarTipo(b?.tipo) === "MOTO" ? 4 : 1;
    if (ta !== tb) return ta - tb;
    if (ta === 4) {
      const ma = prioridadModeloMoto(a), mb = prioridadModeloMoto(b);
      if (ma !== mb) return ma - mb;
    }
    return String(a?.numero || "").localeCompare(String(b?.numero || ""), "es", { numeric: true });
  }

  function normalizarLock(row) {
    const numero = normalizarNumero(row?.numero_movil);
    if (!numero) return null;
    return {
      numero,
      guardia_fecha: limpiar(row?.guardia_fecha),
      owner_id: limpiar(row?.owner_id),
      session_id: limpiar(row?.session_id),
      expires_at: limpiar(row?.expires_at),
    };
  }
  function lockPropio(lock) { return !!lock && lock.owner_id === OWNER_ID && lock.session_id === SESSION_ID; }
  function obtenerLock(numero) { return estado.locks.get(normalizarNumero(numero)); }
  function visibles() { return estado.moviles.filter((m) => m?.numero && (m.condicion || !!obtenerLock(m.numero))); }

  function renderChips() {
    const r = capturarRefs();
    const moduloUi = ui();
    if (moduloUi?.renderChips) {
      const result = moduloUi.renderChips({
        refs: r,
        visibles: visibles(),
        firmaAnterior: estado.firmaRender,
        baseNumeros: BASE_NUMEROS,
        limpiarTextoSimple: limpiar,
        normalizarTipoMovilControl: normalizarTipo,
        ordenarMovilesControl: ordenarMoviles,
        obtenerLockControlMovil: obtenerLock,
        lockControlMovilEsPropio: lockPropio,
        normalizarBasicoSinAcentos: normalizarBasico,
        onSeleccionar: seleccionarMovil,
        setEstado,
      });
      if (typeof result?.firmaRender === "string") estado.firmaRender = result.firmaRender;
      return;
    }
    setEstado("No se pudo cargar la interfaz de Control de Móviles.");
  }

  async function cargarMoviles() {
    const data = await fetchTabla(TABLA_MOVILES, {
      params: {
        select: "id,numero,tipo,modelo,dominio,kilometraje,combustible,observaciones_novedades,condicion,activo",
        activo: "eq.true",
        order: "numero.asc",
      },
      extraHeaders: { Accept: "application/json" },
    });
    estado.moviles = (Array.isArray(data) ? data : []).map(normalizarMovil).filter((m) => m.numero).sort(ordenarMoviles);
    renderChips();
    return estado.moviles;
  }

  async function cargarLocks() {
    const guardia = obtenerGuardia();
    const data = await fetchTabla(TABLA_LOCKS, {
      params: {
        select: "numero_movil,guardia_fecha,owner_id,session_id,locked_at,updated_at,expires_at",
        guardia_fecha: `eq.${guardia.guardia_fecha}`,
        expires_at: `gt.${ahoraISO()}`,
      },
      extraHeaders: { Accept: "application/json" },
    });
    estado.locks = new Map();
    (Array.isArray(data) ? data : []).forEach((row) => {
      const lock = normalizarLock(row);
      if (lock) estado.locks.set(lock.numero, lock);
    });
    if (estado.seleccionado) {
      const lock = obtenerLock(estado.seleccionado.numero);
      if (lock && !lockPropio(lock)) {
        alert(`El móvil ${estado.seleccionado.numero} está bloqueado por otro controlador.`);
        volverASeleccion();
      }
    }
    renderChips();
    return estado.locks;
  }

  async function registrarPresencia() {
    const guardia = obtenerGuardia();
    const now = ahoraISO();
    await fetchTabla(TABLA_PRESENCE, {
      method: "POST",
      params: { on_conflict: "session_id" },
      body: {
        owner_id: OWNER_ID,
        session_id: SESSION_ID,
        guardia_fecha: guardia.guardia_fecha,
        entered_at: now,
        heartbeat_at: now,
        expires_at: ahoraISO(PRESENCE_TTL_MS),
      },
      extraHeaders: { Prefer: "resolution=merge-duplicates,return=minimal" },
    });
  }

  async function borrarPresenciaPropia({ keepalive = false } = {}) {
    await fetchTabla(TABLA_PRESENCE, {
      method: "DELETE",
      params: { session_id: `eq.${SESSION_ID}` },
      extraHeaders: { Prefer: "return=minimal" },
      keepalive,
    }).catch(() => null);
  }

  async function borrarLocksPropios({ keepalive = false } = {}) {
    const guardia = obtenerGuardia();
    await fetchTabla(TABLA_LOCKS, {
      method: "DELETE",
      params: {
        guardia_fecha: `eq.${guardia.guardia_fecha}`,
        owner_id: `eq.${OWNER_ID}`,
        session_id: `eq.${SESSION_ID}`,
      },
      extraHeaders: { Prefer: "return=minimal" },
      keepalive,
    }).catch(() => null);
    for (const [n, lock] of estado.locks.entries()) {
      if (lockPropio(lock)) estado.locks.delete(n);
    }
    renderChips();
  }

  async function guardarLock(numero) {
    const n = normalizarNumero(numero);
    const guardia = obtenerGuardia();
    const now = ahoraISO();
    const payload = {
      numero_movil: n,
      guardia_fecha: guardia.guardia_fecha,
      owner_id: OWNER_ID,
      session_id: SESSION_ID,
      locked_at: now,
      updated_at: now,
      expires_at: ahoraISO(LOCK_TTL_MS),
    };
    await fetchTabla(TABLA_LOCKS, {
      method: "POST",
      params: { on_conflict: "guardia_fecha,numero_movil" },
      body: payload,
      extraHeaders: { Prefer: "resolution=merge-duplicates,return=representation", Accept: "application/json" },
    });
    const lock = normalizarLock(payload);
    if (lock) estado.locks.set(n, lock);
    renderChips();
  }

  async function asegurarSupabaseJs() {
    if (window.supabase?.createClient) return true;
    return await new Promise((resolve) => {
      const existente = document.querySelector("script[data-control-moviles-supabase-js='1']");
      if (existente) {
        existente.addEventListener("load", () => resolve(!!window.supabase?.createClient), { once: true });
        existente.addEventListener("error", () => resolve(false), { once: true });
        setTimeout(() => resolve(!!window.supabase?.createClient), 5000);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.async = true;
      script.dataset.controlMovilesSupabaseJs = "1";
      script.onload = () => resolve(!!window.supabase?.createClient);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
      setTimeout(() => resolve(!!window.supabase?.createClient), 5000);
    });
  }

  function detenerRealtime() {
    if (estado.realtimeRefresh) clearTimeout(estado.realtimeRefresh);
    estado.realtimeRefresh = null;
    if (estado.realtimeClient && estado.realtimeChannel) {
      try { estado.realtimeClient.removeChannel(estado.realtimeChannel); } catch (_) {}
    }
    estado.realtimeChannel = null;
    estado.realtimeClient = null;
  }

  async function iniciarRealtime() {
    const ok = await asegurarSupabaseJs();
    if (!ok || !estado.activa) return false;
    detenerRealtime();
    const guardia = obtenerGuardia();
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const refrescar = () => {
      if (estado.realtimeRefresh) clearTimeout(estado.realtimeRefresh);
      estado.realtimeRefresh = setTimeout(async () => {
        if (!estado.activa) return;
        try {
          await cargarLocks();
          await cargarMoviles();
        } catch (e) {
          console.warn("[Informes GP][Control móviles] Realtime: no se pudo refrescar.", e);
        }
      }, 250);
    };
    const channel = client
      .channel(`igp-control-moviles-${guardia.guardia_fecha}-${SESSION_ID.slice(-8)}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: TABLA_LOCKS,
        filter: `guardia_fecha=eq.${guardia.guardia_fecha}`,
      }, refrescar)
      .subscribe();
    estado.realtimeClient = client;
    estado.realtimeChannel = channel;
    return true;
  }

  function iniciarHeartbeat() {
    detenerHeartbeat();
    estado.heartbeat = setInterval(() => {
      if (!estado.activa) return;
      registrarPresencia().catch((e) => console.warn("[Informes GP][Control móviles] Heartbeat falló.", e));
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
      setEstado("Cargando móviles en servicio...");
      await registrarPresencia();
      await cargarLocks();
      await cargarMoviles();
      iniciarHeartbeat();
      iniciarRealtime().catch(() => false);
    } catch (e) {
      console.error("[Informes GP][Control móviles] Error iniciando control compartido.", e);
      setEstado("No se pudieron cargar móviles en servicio. Revisá la conexión.");
    } finally {
      estado.iniciando = false;
    }
  }

  async function detenerCompartido() {
    if (estado.deteniendo) return;
    estado.deteniendo = true;
    detenerHeartbeat();
    detenerRealtime();
    try {
      // Regla pedida: los móviles controlados por ESTA sesión se liberan cuando ESTE controlador sale.
      await borrarLocksPropios();
      await borrarPresenciaPropia();
    } finally {
      estado.deteniendo = false;
    }
  }

  function aplicarFormulario(movil) {
    const r = capturarRefs();
    const moduloUi = ui();
    estado.seleccionado = movil;
    document.body.classList.add("control-movil-seleccionado-activo");
    if (moduloUi?.aplicarMovilAlFormulario) moduloUi.aplicarMovilAlFormulario(movil, r);
    else {
      if (r.controlMovilNumeroSeleccionado) r.controlMovilNumeroSeleccionado.textContent = movil.numero;
      if (r.controlMovilKilometraje) r.controlMovilKilometraje.value = movil.kilometraje || "";
      if (r.controlMovilCombustible) r.controlMovilCombustible.value = movil.combustible || "";
      if (r.controlMovilObservaciones) r.controlMovilObservaciones.value = movil.observaciones_novedades || "";
      if (r.controlMovilFueraServicio) { r.controlMovilFueraServicio.disabled = false; r.controlMovilFueraServicio.checked = !movil.condicion; }
    }
    if (moduloUi?.mostrarFormulario) moduloUi.mostrarFormulario(r);
    else {
      r.controlMovilesChips?.classList.add("hidden");
      r.controlMovilesFormulario?.classList.remove("hidden");
    }
    if (r.btnSalir) r.btnSalir.classList.add("hidden");
    setEstado("Complete kilometraje, combustible, observaciones y fotos si corresponde.");
    setTimeout(() => r.controlMovilKilometraje?.focus?.(), 60);
  }

  async function seleccionarMovil(numero) {
    const n = normalizarNumero(numero);
    try { await cargarLocks(); } catch (_) {}
    const lock = obtenerLock(n);
    if (lock && !lockPropio(lock)) {
      alert(`El móvil ${n} ya fue controlado por otro usuario y está bloqueado.`);
      renderChips();
      return;
    }
    let movil = estado.moviles.find((m) => m.numero === n);
    if (!movil) return;
    try {
      const data = await fetchTabla(TABLA_MOVILES, {
        params: { select: "id,numero,tipo,modelo,dominio,kilometraje,combustible,observaciones_novedades,condicion,activo", numero: `eq.${n}`, limit: "1" },
        extraHeaders: { Accept: "application/json" },
      });
      if (Array.isArray(data) && data[0]) movil = normalizarMovil(data[0]);
    } catch (_) {}
    aplicarFormulario(movil);
  }

  function volverASeleccion() {
    const r = capturarRefs();
    const moduloUi = ui();
    estado.seleccionado = null;
    document.body.classList.remove("control-movil-seleccionado-activo");
    if (moduloUi?.volverASeleccion) {
      moduloUi.volverASeleccion(r, { hayMoviles: visibles().length > 0, setEstado });
    } else {
      r.controlMovilesFormulario?.classList.add("hidden");
      r.controlMovilesChips?.classList.remove("hidden");
      if (r.controlMovilFueraServicio) { r.controlMovilFueraServicio.checked = false; r.controlMovilFueraServicio.disabled = true; }
    }
    if (r.btnSalir && estado.activa) r.btnSalir.classList.remove("hidden");
    renderChips();
  }

  function extensionFoto(file) {
    const match = limpiar(file?.name).match(/\.([a-z0-9]{2,5})$/i);
    if (match) return match[1].toLowerCase();
    const type = String(file?.type || "").toLowerCase();
    if (type.includes("png")) return "png";
    if (type.includes("webp")) return "webp";
    return "jpg";
  }

  async function subirFoto(file, numero, slot) {
    if (!file) return null;
    const guardia = obtenerGuardia();
    const path = `${guardia.guardia_fecha}/${normalizarNumero(numero)}/${Date.now()}_${slot}.${extensionFoto(file)}`;
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_FOTOS}/${path}`, {
      method: "POST",
      headers: headers({ "Content-Type": file.type || "image/jpeg", "x-upsert": "false" }),
      body: file,
    });
    if (!response.ok) throw new Error(`Foto ${slot}: ${response.status} ${await response.text().catch(() => "")}`);
    return { slot, path, url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_FOTOS}/${path}` };
  }

  async function insertarControl(payload) {
    return await fetchTabla(TABLA_CONTROLES, {
      method: "POST", body: payload,
      extraHeaders: { Prefer: "return=representation", Accept: "application/json" },
    });
  }

  async function actualizarEstadoMovil(numero, kilometraje, combustible, observaciones, fueraServicio) {
    await fetchTabla(TABLA_MOVILES, {
      method: "PATCH",
      params: { numero: `eq.${Number(numero)}` },
      body: {
        kilometraje: Number(kilometraje),
        combustible,
        observaciones_novedades: observaciones,
        condicion: !fueraServicio,
      },
      extraHeaders: { Prefer: "return=minimal" },
    });
  }

  async function insertarFotos({ controlId, fotos, movil, observaciones, guardia }) {
    const validas = fotos.filter(Boolean);
    if (!validas.length) return;
    const payload = validas.map((foto) => ({
      control_id: controlId || null,
      movil_id: movil.id == null ? null : String(movil.id),
      numero_movil: Number(movil.numero),
      guardia_fecha: guardia.guardia_fecha,
      guardia_inicio: guardia.guardia_inicio,
      guardia_fin: guardia.guardia_fin,
      foto_url: foto.url,
      foto_path: foto.path,
      slot: foto.slot,
      fuente: "INFORMES_GP",
      observaciones: observaciones || "",
    }));
    await fetchTabla(TABLA_FOTOS, {
      method: "POST", body: payload,
      extraHeaders: { Prefer: "return=minimal" },
    });
  }

  function colorMarca(cantidad) {
    const n = Math.max(1, parseInt(cantidad, 10) || 1);
    if (n >= 3) return "NEGRA";
    if (n === 2) return "AZUL";
    return "DORADA";
  }

  async function registrarMarcaBmzcn(numero, guardia) {
    const data = await fetchTabla(TABLA_ESTADO, {
      params: {
        select: "cantidad_controles_ventana,expires_at",
        guardia_fecha: `eq.${guardia.guardia_fecha}`,
        numero_movil: `eq.${Number(numero)}`,
        limit: "1",
      },
      extraHeaders: { Accept: "application/json" },
    }).catch(() => []);
    const existente = Array.isArray(data) ? data[0] : null;
    let cantidadAnterior = 0;
    if (existente) {
      const exp = existente.expires_at ? new Date(existente.expires_at).getTime() : 0;
      if (!exp || exp > Date.now()) cantidadAnterior = parseInt(existente.cantidad_controles_ventana, 10) || 1;
    }
    const cantidad = cantidadAnterior + 1;
    const now = ahoraISO();
    await fetchTabla(TABLA_ESTADO, {
      method: "POST",
      params: { on_conflict: "guardia_fecha,numero_movil" },
      body: {
        guardia_fecha: guardia.guardia_fecha,
        numero_movil: Number(numero),
        controlado: true,
        controlado_at: now,
        expires_at: ahoraISO(LOCK_TTL_MS),
        cantidad_controles_ventana: cantidad,
        color_marca: colorMarca(cantidad),
        ultimo_session_id: SESSION_ID,
        ultimo_owner_id: OWNER_ID,
        fuente: "INFORMES_GP",
        updated_at: now,
      },
      extraHeaders: { Prefer: "resolution=merge-duplicates,return=minimal" },
    });
  }

  async function guardarControl() {
    const r = capturarRefs();
    const movil = estado.seleccionado;
    if (!movil) { alert("Seleccione un móvil en servicio."); return; }

    const kilometraje = String(r.controlMovilKilometraje?.value || "").replace(/\D+/g, "");
    const combustible = normalizarCombustible(r.controlMovilCombustible?.value || "");
    const observaciones = limpiar(r.controlMovilObservaciones?.value || "");
    const fueraServicio = !!r.controlMovilFueraServicio?.checked;

    if (!kilometraje) { alert("Complete el kilometraje. Solo se aceptan números."); r.controlMovilKilometraje?.focus(); return; }
    if (!COMBUSTIBLES.includes(combustible)) { alert("Seleccione un combustible válido."); r.controlMovilCombustible?.focus(); return; }

    try {
      await cargarLocks();
      const lockActual = obtenerLock(movil.numero);
      if (lockActual && !lockPropio(lockActual)) {
        alert(`El móvil ${movil.numero} fue bloqueado por otro usuario.`);
        volverASeleccion();
        return;
      }

      if (r.btnCambiarMovilControl) { r.btnCambiarMovilControl.disabled = true; r.btnCambiarMovilControl.textContent = "Guardando..."; }
      setEstado("Guardando control de móvil...");

      let foto1 = null, foto2 = null;
      try { foto1 = await subirFoto(r.controlMovilFoto1?.files?.[0] || null, movil.numero, "foto1"); } catch (e) { console.warn("Foto 1 no guardada; el control continúa.", e); }
      try { foto2 = await subirFoto(r.controlMovilFoto2?.files?.[0] || null, movil.numero, "foto2"); } catch (e) { console.warn("Foto 2 no guardada; el control continúa.", e); }

      const guardia = obtenerGuardia();
      const insertado = await insertarControl({
        movil_id: movil.id,
        numero_movil: Number(movil.numero),
        kilometraje: Number(kilometraje),
        combustible,
        observaciones,
        guardia_fecha: guardia.guardia_fecha,
        guardia_inicio: guardia.guardia_inicio,
        guardia_fin: guardia.guardia_fin,
        fuente: "INFORMES_GP",
      });
      const control = Array.isArray(insertado) ? insertado[0] : insertado;

      await actualizarEstadoMovil(movil.numero, kilometraje, combustible, observaciones, fueraServicio);

      try { await insertarFotos({ controlId: control?.id || null, fotos: [foto1, foto2], movil, observaciones, guardia }); }
      catch (e) { console.warn("Control guardado; no se pudo registrar la tabla de fotos.", e); }

      try { await registrarMarcaBmzcn(movil.numero, guardia); }
      catch (e) { console.warn("Control guardado; no se pudo registrar la marca BMZCN.", e); }

      try { await guardarLock(movil.numero); }
      catch (e) { console.warn("Control guardado; no se pudo activar el bloqueo amarillo compartido.", e); }

      await cargarMoviles().catch(() => null);
      await cargarLocks().catch(() => null);
      volverASeleccion();
      setEstado("Control guardado. Seleccione otro móvil o presione Salir.");
    } catch (e) {
      console.error("[Informes GP][Control móviles] Error guardando.", e);
      alert(`No se pudo guardar el control de móvil. ${e?.message || ""}`.trim());
      setEstado("No se pudo guardar el control de móvil.");
    } finally {
      if (r.btnCambiarMovilControl) { r.btnCambiarMovilControl.disabled = false; r.btnCambiarMovilControl.textContent = "Guardar"; }
    }
  }

  function preview(input, img) {
    const file = input?.files?.[0];
    if (!img) return;
    if (!file) { img.src = ""; img.classList.add("hidden"); return; }
    try { img.src = URL.createObjectURL(file); img.classList.remove("hidden"); } catch (_) { img.classList.add("hidden"); }
  }

  function cerrarAyuda() {
    const r = capturarRefs();
    const moduloUi = ui();
    if (moduloUi?.cerrarAyuda) return moduloUi.cerrarAyuda(r);
    r.controlMovilesAyudaPopup?.classList.add("hidden");
  }
  function alternarAyuda(e) {
    e?.preventDefault(); e?.stopPropagation();
    const r = capturarRefs();
    const moduloUi = ui();
    if (moduloUi?.alternarAyuda) return moduloUi.alternarAyuda(e, r);
    r.controlMovilesAyudaPopup?.classList.toggle("hidden");
  }

  async function salirControlMoviles() {
    const r = capturarRefs();
    if (r.btnSalir) { r.btnSalir.disabled = true; r.btnSalir.textContent = "Saliendo..."; }
    try { await detenerCompartido(); }
    finally {
      estado.activa = false;
      estado.seleccionado = null;
      document.body.classList.remove("modo-control-moviles", "control-movil-seleccionado-activo");
      r.bloqueControlMoviles?.classList.add("hidden");
      r.btnSalir?.classList.add("hidden");
      if (r.btnSalir) { r.btnSalir.disabled = false; r.btnSalir.textContent = "Salir"; }
    }
    const selector = $("selectorModoInformeSelect") || $("selectorModoInforme");
    if (selector) {
      selector.value = "INICIA";
      selector.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function setActiva(activa) {
    const r = capturarRefs();
    const nueva = !!activa;
    if (nueva === estado.activa) {
      if (nueva) renderChips();
      return;
    }
    estado.activa = nueva;
    document.body.classList.toggle("modo-control-moviles", nueva);
    if (nueva) {
      r.bloqueControlMoviles?.classList.remove("hidden");
      r.btnSalir?.classList.remove("hidden");
      volverASeleccion();
      iniciarCompartido();
    } else {
      estado.seleccionado = null;
      document.body.classList.remove("control-movil-seleccionado-activo");
      r.bloqueControlMoviles?.classList.add("hidden");
      r.btnSalir?.classList.add("hidden");
      cerrarAyuda();
      detenerCompartido();
    }
  }

  function asegurarCssVersion() {
    const href = new URL(`frontend/compatibilidad/control-moviles/control-moviles.css?v=${VERSION}`, document.baseURI).href;
    let link = document.querySelector("link[data-control-moviles-css-paridad='1']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.dataset.controlMovilesCssParidad = "1";
      document.head.appendChild(link);
    }
    link.href = href;
  }

  async function cargarHtml(mount) {
    if ($("bloqueControlMoviles") && $("controlMovilesSalirCompat")) return;
    const response = await fetch(new URL(`frontend/compatibilidad/control-moviles/control-moviles.html?v=${VERSION}`, document.baseURI).href, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo cargar Control de Móviles: HTTP ${response.status}`);
    (mount || document.body).insertAdjacentHTML("beforeend", await response.text());
  }

  function bind() {
    if (document.body.dataset.igpControlMovilesParidadBound === "1") return;
    document.body.dataset.igpControlMovilesParidadBound = "1";
    document.addEventListener("click", (e) => {
      if (e.target.closest("#controlMovilesAyudaBtn")) return alternarAyuda(e);
      if (e.target.closest("#btnCambiarMovilControl")) { e.preventDefault(); return guardarControl(); }
      if (e.target.closest("#controlMovilesSalirCompat")) { e.preventDefault(); return salirControlMoviles(); }
      const popup = $("controlMovilesAyudaPopup");
      const wrap = $("controlMovilesAyudaWrap");
      if (popup && !popup.classList.contains("hidden") && !wrap?.contains(e.target)) cerrarAyuda();
    }, true);
    document.addEventListener("change", (e) => {
      const r = capturarRefs();
      if (e.target === r.controlMovilFoto1) preview(r.controlMovilFoto1, r.controlMovilPreview1);
      if (e.target === r.controlMovilFoto2) preview(r.controlMovilFoto2, r.controlMovilPreview2);
    });
    document.addEventListener("input", (e) => {
      const r = capturarRefs();
      if (e.target === r.controlMovilKilometraje) r.controlMovilKilometraje.value = String(r.controlMovilKilometraje.value || "").replace(/\D+/g, "");
    });
    window.addEventListener("pagehide", () => {
      if (!estado.activa) return;
      borrarLocksPropios({ keepalive: true });
      borrarPresenciaPropia({ keepalive: true });
    });
  }

  async function init(config = {}) {
    const mount = typeof config.mount === "string" ? document.querySelector(config.mount) : config.mount;
    asegurarCssVersion();
    await cargarHtml(mount || document.body);
    capturarRefs();
    bind();
    estado.inicializado = true;
    setActiva(false);
    return { ok: true, version: VERSION };
  }

  window.WSP.modules.controlMoviles = {
    version: VERSION,
    init,
    setActiva,
    render: renderChips,
    seleccionarMovil,
    volverASeleccion,
    salirControlMoviles,
    recargar: async () => { await cargarLocks(); await cargarMoviles(); },
  };

  console.log("[Informes GP][Control móviles] cargado", VERSION);
})();
