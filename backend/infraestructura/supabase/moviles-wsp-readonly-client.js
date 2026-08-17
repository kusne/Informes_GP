import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/**
 * Cliente SECUNDARIO de Informes GP para el padrón y los controles de móviles
 * alojados en el proyecto Supabase compartido con WSP/BMZCN.
 *
 * La lectura del padrón y la escritura de controles quedan encapsuladas en
 * backend/infraestructura. El frontend accede exclusivamente a través de api/.
 */
const SUPABASE_MOVILES_WSP_URL = "https://ugeydxozfewzhldjbkat.supabase.co";
const SUPABASE_MOVILES_WSP_PUBLISHABLE_KEY = "sb_publishable_ZeLC2rOxhhUXlQdvJ28JkA_qf802-pX";

const TABLA_MOVILES = "moviles_bmzcn";
const TABLA_CONTROLES = "moviles_controles";
const TABLA_FOTOS = "moviles_fotos_guardia";
const TABLA_ESTADO_RECURSOS = "recursos_controles_wsp_estado";
const BUCKET_FOTOS = "moviles-control-fotos";
const FUENTE_INFORMES_GP = "INFORMES_GP";
const VIGENCIA_MARCA_MS = 2 * 60 * 60 * 1000;

const COMBUSTIBLES_VALIDOS = Object.freeze([
  "",
  "reserva",
  "1/4",
  "+1/4",
  "-1/2",
  "1/2",
  "+1/2",
  "3/4",
  "+3/4",
  "lleno"
]);

const SELECT_PADRON = [
  "id",
  "numero",
  "tipo",
  "modelo",
  "dominio",
  "kilometraje",
  "combustible",
  "observaciones_novedades",
  "condicion",
  "activo"
].join(",");

let clienteMovilesWsp = null;

export function obtenerClienteMovilesWspSoloLectura() {
  return obtenerClienteMovilesWsp();
}

export function obtenerClienteMovilesWsp() {
  if (clienteMovilesWsp) return clienteMovilesWsp;

  clienteMovilesWsp = createClient(
    SUPABASE_MOVILES_WSP_URL,
    SUPABASE_MOVILES_WSP_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      realtime: {
        params: { eventsPerSecond: 1 }
      }
    }
  );

  return clienteMovilesWsp;
}

export async function listarPadronMovilesWspSoloLectura({
  soloActivos = true
} = {}) {
  const cliente = obtenerClienteMovilesWsp();

  let query = cliente
    .from(TABLA_MOVILES)
    .select(SELECT_PADRON)
    .order("numero", { ascending: true });

  if (soloActivos) query = query.eq("activo", true);

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `No se pudo leer el padrón de móviles WSP (${error.code || "sin-codigo"}): ${error.message || error}`
    );
  }

  return (Array.isArray(data) ? data : [])
    .map(normalizarMovil)
    .filter((movil) => Boolean(movil.numero));
}

export async function diagnosticarPadronMovilesWspSoloLectura() {
  const moviles = await listarPadronMovilesWspSoloLectura({ soloActivos: true });

  return {
    ok: true,
    proyecto: "WSP_BMZCN",
    tabla: TABLA_MOVILES,
    modo: "LECTURA_PADRON",
    total: moviles.length,
    numeros: moviles.map((movil) => movil.numero),
    moviles
  };
}

/**
 * Guarda un control originado en Informes GP usando el mismo contrato central
 * que WSP/BMZCN:
 *   1) INSERT moviles_controles (historial)
 *   2) UPDATE moviles_bmzcn (estado actual)
 *   3) UPSERT recursos_controles_wsp_estado (marca visible/realtime BMZCN)
 *   4) Fotos, si existen, son complementarias y no bloquean el control.
 */
export async function guardarControlMovilWspDesdeInformesGp(payload = {}) {
  const cliente = obtenerClienteMovilesWsp();
  const numero = normalizarNumeroMovil(payload.numero ?? payload.numero_movil);
  const kilometraje = normalizarKilometraje(payload.kilometraje);
  const combustible = normalizarCombustible(payload.combustible);
  const observaciones = texto(payload.observaciones);
  const fueraServicio = payload.fueraServicio === true || payload.fuera_servicio === true;

  if (!numero) {
    throw new Error("Seleccione un móvil válido.");
  }
  if (!kilometraje) {
    throw new Error("Complete el kilometraje. Solo se aceptan números.");
  }
  if (!COMBUSTIBLES_VALIDOS.includes(combustible)) {
    throw new Error("Seleccione un combustible válido.");
  }

  const movil = await buscarMovilActivoPorNumero(cliente, numero);
  if (!movil) {
    throw new Error(`El móvil ${numero} no existe o no está activo en el padrón WSP/BMZCN.`);
  }

  const guardia = obtenerGuardiaControlMovil();
  const controladoAt = new Date().toISOString();

  const control = await insertarControlHistorico(cliente, {
    movil_id: movil.id || null,
    numero_movil: Number(numero),
    kilometraje: Number(kilometraje),
    combustible,
    observaciones,
    guardia_fecha: guardia.guardia_fecha,
    guardia_inicio: guardia.guardia_inicio,
    guardia_fin: guardia.guardia_fin,
    fuente: FUENTE_INFORMES_GP
  });

  await actualizarEstadoActualMovil(cliente, {
    numero,
    kilometraje,
    combustible,
    observaciones,
    fueraServicio
  });

  const fotosResultado = await guardarFotosComplementarias(cliente, {
    control,
    fotos: payload.fotos || {},
    numero,
    movilId: movil.id || null,
    observaciones,
    guardia
  });

  let marca = null;
  let marcaOk = false;
  let errorMarca = "";

  try {
    marca = await registrarMarcaBmzcn(cliente, {
      numero,
      guardia,
      controladoAt
    });
    marcaOk = true;
  } catch (error) {
    errorMarca = String(error?.message || error || "Error desconocido");
    console.warn("[Informes_GP] El control se guardó, pero falló la marca BMZCN.", error);
  }

  return {
    ok: true,
    fuente: FUENTE_INFORMES_GP,
    numero,
    movil: {
      ...normalizarMovil(movil),
      kilometraje: Number(kilometraje),
      combustible,
      observaciones_novedades: observaciones,
      condicion: !fueraServicio
    },
    control,
    guardia,
    marcaOk,
    marca,
    errorMarca,
    fotos: fotosResultado,
    mensaje: marcaOk
      ? `Control guardado para móvil ${numero}.`
      : `Control guardado para móvil ${numero}, pero no pudo actualizarse la marca BMZCN.`
  };
}

async function buscarMovilActivoPorNumero(cliente, numero) {
  const { data, error } = await cliente
    .from(TABLA_MOVILES)
    .select(SELECT_PADRON)
    .eq("numero", Number(numero))
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo validar el móvil ${numero}: ${error.message || error}`);
  }

  return data || null;
}

async function insertarControlHistorico(cliente, payload) {
  const { data, error } = await cliente
    .from(TABLA_CONTROLES)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`No se pudo registrar el control histórico: ${error.message || error}`);
  }

  return data || null;
}

async function actualizarEstadoActualMovil(cliente, {
  numero,
  kilometraje,
  combustible,
  observaciones,
  fueraServicio
}) {
  const { error } = await cliente
    .from(TABLA_MOVILES)
    .update({
      kilometraje: Number(kilometraje),
      combustible,
      observaciones_novedades: observaciones,
      condicion: !fueraServicio
    })
    .eq("numero", Number(numero));

  if (error) {
    throw new Error(`No se pudo actualizar el estado actual del móvil: ${error.message || error}`);
  }
}

async function registrarMarcaBmzcn(cliente, { numero, guardia, controladoAt }) {
  const existente = await leerMarcaVigente(cliente, numero, guardia.guardia_fecha);
  const cantidadAnterior = existente
    ? Math.max(1, Number.parseInt(existente.cantidad_controles_ventana, 10) || 1)
    : 0;
  const cantidad = cantidadAnterior > 0 ? cantidadAnterior + 1 : 1;
  const colorMarca = colorMarcaDesdeCantidad(cantidad);
  const expiresAt = new Date(Date.now() + VIGENCIA_MARCA_MS).toISOString();

  const payload = {
    guardia_fecha: guardia.guardia_fecha,
    numero_movil: Number(numero),
    controlado: true,
    controlado_at: controladoAt,
    expires_at: expiresAt,
    cantidad_controles_ventana: cantidad,
    color_marca: colorMarca,
    fuente: FUENTE_INFORMES_GP,
    updated_at: controladoAt
  };

  const { data, error } = await cliente
    .from(TABLA_ESTADO_RECURSOS)
    .upsert(payload, { onConflict: "guardia_fecha,numero_movil" })
    .select("guardia_fecha,numero_movil,controlado,controlado_at,expires_at,cantidad_controles_ventana,color_marca,fuente,updated_at")
    .single();

  if (error) {
    throw new Error(`No se pudo actualizar la marca BMZCN: ${error.message || error}`);
  }

  return data || payload;
}

async function leerMarcaVigente(cliente, numero, guardiaFecha) {
  const { data, error } = await cliente
    .from(TABLA_ESTADO_RECURSOS)
    .select("id,guardia_fecha,numero_movil,expires_at,cantidad_controles_ventana,color_marca")
    .eq("guardia_fecha", guardiaFecha)
    .eq("numero_movil", Number(numero))
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer el estado BMZCN vigente: ${error.message || error}`);
  }

  if (!data) return null;
  if (!data.expires_at) return data;

  const expires = new Date(data.expires_at);
  if (Number.isNaN(expires.getTime())) return data;
  return expires.getTime() > Date.now() ? data : null;
}

async function guardarFotosComplementarias(cliente, {
  control,
  fotos,
  numero,
  movilId,
  observaciones,
  guardia
}) {
  const entradas = [
    { slot: "foto1", file: fotos?.foto1 || null },
    { slot: "foto2", file: fotos?.foto2 || null }
  ].filter((item) => item.file);

  if (!entradas.length) {
    return { ok: true, total: 0, guardadas: [], errores: [] };
  }

  const guardadas = [];
  const errores = [];

  for (const item of entradas) {
    try {
      const subida = await subirArchivoControlMovil(cliente, {
        file: item.file,
        numero,
        slot: item.slot,
        guardiaFecha: guardia.guardia_fecha
      });
      guardadas.push(subida);
    } catch (error) {
      errores.push({ slot: item.slot, error: String(error?.message || error) });
      console.warn(`[Informes_GP] No se pudo subir ${item.slot}; el control continúa guardado.`, error);
    }
  }

  if (guardadas.length) {
    try {
      const filas = guardadas.map((foto) => ({
        control_id: control?.id || null,
        movil_id: movilId == null ? null : String(movilId),
        numero_movil: Number(numero),
        guardia_fecha: guardia.guardia_fecha,
        guardia_inicio: guardia.guardia_inicio,
        guardia_fin: guardia.guardia_fin,
        foto_url: foto.url,
        foto_path: foto.path,
        slot: foto.slot,
        fuente: FUENTE_INFORMES_GP,
        observaciones
      }));

      const { error } = await cliente.from(TABLA_FOTOS).insert(filas);
      if (error) throw error;
    } catch (error) {
      errores.push({ slot: "tabla_fotos", error: String(error?.message || error) });
      console.warn("[Informes_GP] Las fotos subieron, pero no pudieron vincularse al control.", error);
    }
  }

  return {
    ok: errores.length === 0,
    total: guardadas.length,
    guardadas,
    errores
  };
}

async function subirArchivoControlMovil(cliente, { file, numero, slot, guardiaFecha }) {
  const extension = extensionArchivo(file);
  const path = `${guardiaFecha}/${numero}/${Date.now()}_${slot}.${extension}`;

  const { data, error } = await cliente.storage
    .from(BUCKET_FOTOS)
    .upload(path, file, {
      upsert: false,
      contentType: texto(file?.type) || "application/octet-stream"
    });

  if (error) {
    throw new Error(`No se pudo subir ${slot}: ${error.message || error}`);
  }

  const publicUrl = cliente.storage.from(BUCKET_FOTOS).getPublicUrl(data?.path || path);

  return {
    slot,
    path: data?.path || path,
    url: publicUrl?.data?.publicUrl || ""
  };
}

function obtenerGuardiaControlMovil(ahora = new Date()) {
  const desde = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
    6,
    0,
    0,
    0
  );

  if (ahora < desde) desde.setDate(desde.getDate() - 1);

  const hasta = new Date(desde);
  hasta.setDate(hasta.getDate() + 1);

  return {
    guardia_fecha: fechaLocalIso(desde),
    guardia_inicio: fechaHoraLocalIso(desde),
    guardia_fin: fechaHoraLocalIso(hasta)
  };
}

function colorMarcaDesdeCantidad(cantidad) {
  const n = Math.max(1, Number.parseInt(cantidad, 10) || 1);
  if (n >= 3) return "NEGRA";
  if (n === 2) return "AZUL";
  return "DORADA";
}

function normalizarMovil(row = {}) {
  return {
    id: texto(row.id),
    numero: texto(row.numero),
    tipo: texto(row.tipo),
    modelo: texto(row.modelo),
    dominio: texto(row.dominio),
    kilometraje: numeroNoNegativo(row.kilometraje),
    combustible: normalizarCombustible(row.combustible),
    observaciones_novedades: texto(row.observaciones_novedades),
    condicion: Boolean(row.condicion),
    activo: row.activo !== false
  };
}

function normalizarNumeroMovil(valor) {
  return texto(valor).replace(/\D+/g, "");
}

function normalizarKilometraje(valor) {
  return texto(valor).replace(/\D+/g, "");
}

function normalizarCombustible(valor) {
  const v = texto(valor).toLowerCase();
  return COMBUSTIBLES_VALIDOS.includes(v) ? v : v;
}

function numeroNoNegativo(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function fechaLocalIso(d) {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

function fechaHoraLocalIso(d) {
  return `${fechaLocalIso(d)}T${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

function dos(valor) {
  return String(valor).padStart(2, "0");
}

function extensionArchivo(file) {
  const nombre = texto(file?.name);
  const match = nombre.match(/\.([a-z0-9]{2,6})$/i);
  if (match) return match[1].toLowerCase();

  const tipo = texto(file?.type).toLowerCase();
  if (tipo.includes("png")) return "png";
  if (tipo.includes("webp")) return "webp";
  if (tipo.includes("mp4")) return "mp4";
  if (tipo.includes("quicktime")) return "mov";
  return "jpg";
}

function texto(valor) {
  return String(valor ?? "").trim();
}
