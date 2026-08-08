const STORAGE_KEY = "informes_gp_ensayo_estado_v5";
const VERSION_ESTADO = 5;

const PROGRAMADOS_ENSAYO = [
  {
    operativo_key: "ensayo-inicia-ocv-rn168-rp1-0630",
    hora_inicio: "06:30",
    hora_fin: "08:00",
    lugar: "RN 168 Y RP 1",
    tipo_operativo: "OCV",
    tipo_nombre: "OPERATIVO DE CONTROL VEHICULAR"
  },
  {
    operativo_key: "ensayo-inicia-ocv-dicep-tunel-0700",
    hora_inicio: "07:00",
    hora_fin: "09:30",
    lugar: "RN 168 KM 18 - TÚNEL SUBFLUVIAL",
    tipo_operativo: "OCV_DICEP",
    tipo_nombre: "OCV EN CONJUNTO CON DICEP"
  },
  {
    operativo_key: "ensayo-inicia-presencia-puente-0000",
    hora_inicio: "00:00",
    hora_fin: "06:00",
    lugar: "PUENTE CARRETERO",
    tipo_operativo: "PRESENCIA_ACTIVA",
    tipo_nombre: "PRESENCIA ACTIVA O.S. G.P N°1456/26 / O. Op G.P N°1700/25"
  },
  {
    operativo_key: "ensayo-inicia-ordenamiento-rn168-rp1-0630",
    hora_inicio: "06:30",
    hora_fin: "08:00",
    lugar: "RN 168 Y RP 1",
    tipo_operativo: "ORDENAMIENTO_VEHICULAR",
    tipo_nombre: "OPERATIVO ORDENAMIENTO VEHICULAR O.S. G.P N°1456/26 / O. Op G.P N°1091/25"
  },
  {
    operativo_key: "ensayo-inicia-retorno-rn168-rp1-1700",
    hora_inicio: "17:00",
    hora_fin: "FINALIZAR",
    lugar: "RN 168 Y RP 1",
    tipo_operativo: "ORDENAMIENTO_VEHICULAR_RETORNO",
    tipo_nombre: "OPERATIVO ORDENAMIENTO VEHICULAR - RETORNO O. OP G.P N°988/25 - O. S. G.P N°1456/26"
  },
  {
    operativo_key: "ensayo-inicia-exodo-rn168-1600",
    hora_inicio: "16:00",
    hora_fin: "FINALIZAR",
    lugar: "RN 168",
    tipo_operativo: "EXODO",
    tipo_nombre: "Éxodo - Operativo Preventivo"
  },
  {
    operativo_key: "ensayo-inicia-patrullaje-rp1-1600",
    hora_inicio: "16:00",
    hora_fin: "18:00",
    lugar: "RP 1 DEL KM 0 AL KM 25",
    tipo_operativo: "PATRULLAJE",
    tipo_nombre: "PATRULLAJE PREVENTIVO"
  },
  {
    operativo_key: "ensayo-inicia-control-peso-tunel-0900",
    hora_inicio: "09:00",
    hora_fin: "12:00",
    lugar: "RN 168 KM 18 - PEAJE TÚNEL SUBFLUVIAL",
    tipo_operativo: "CONTROL_PESO",
    tipo_nombre: "CONTROL DE PESO"
  },
  {
    operativo_key: "ensayo-inicia-generico-custodia-1800",
    hora_inicio: "18:00",
    hora_fin: "20:00",
    lugar: "HOSPITAL CULLEN",
    tipo_operativo: "GENERICO",
    tipo_nombre: "CUSTODIA Y ACOMPAÑAMIENTO"
  }
];

let estadoMemoria = null;
let storageEnsayo = null;

export function configurarStorageEnsayo(storage = null) {
  storageEnsayo = storage && typeof storage.getItem === "function" && typeof storage.setItem === "function"
    ? storage
    : null;
  return Boolean(storageEnsayo);
}

/**
 * El modo ensayo replica el ciclo real del operativo:
 * PROGRAMADO -> EN_CURSO -> FINALIZADO.
 *
 * No existen "finalizables" prefabricados. FINALIZA muestra exclusivamente
 * los operativos que el usuario inició realmente durante el ensayo.
 */
export function obtenerOperativosEnsayoPorModo(modo, guardiaFecha) {
  const modoNormalizado = normalizarModo(modo);
  const estado = cargarEstadoEnsayo(guardiaFecha);
  const operativos = materializarOperativos(estado);

  if (modoNormalizado === "INICIA") {
    return operativos.filter((item) => item.estado === "PROGRAMADO");
  }

  if (modoNormalizado === "FINALIZA" || modoNormalizado === "INFORMES") {
    return operativos.filter((item) => item.estado === "EN_CURSO");
  }

  return [];
}

/**
 * Registra localmente un envío válido del modo ensayo. Nunca escribe en
 * Supabase. Se persiste mediante un adaptador de almacenamiento para que el estado sobreviva al cambio
 * INICIA <-> FINALIZA y a una recarga del navegador.
 */
export function registrarTransicionOperativoEnsayo({ modo, payload } = {}) {
  const modoNormalizado = normalizarModo(modo);
  const operativoKey = String(payload?.operativo_key || "").trim();
  const guardiaFecha = String(payload?.guardia_fecha || "").trim();

  if (!operativoKey) {
    return {
      ok: false,
      mensaje: "El ensayo no pudo cambiar de estado porque falta operativo_key."
    };
  }

  const base = PROGRAMADOS_ENSAYO.find((item) => item.operativo_key === operativoKey);
  if (!base) {
    return {
      ok: false,
      mensaje: "El operativo no pertenece al catálogo de ensayo."
    };
  }

  const estado = cargarEstadoEnsayo(guardiaFecha);
  const actual = estado.operativos[operativoKey] || crearEstadoOperativoInicial(base);
  const ahora = new Date().toISOString();

  if (modoNormalizado === "INICIA") {
    estado.operativos[operativoKey] = {
      ...actual,
      estado: "EN_CURSO",
      inicio_en: ahora,
      inicio_payload: clonarSerializable(payload),
      finalizado_en: null,
      finalizado_payload: null
    };
  } else if (modoNormalizado === "FINALIZA") {
    estado.operativos[operativoKey] = {
      ...actual,
      estado: "FINALIZADO",
      finalizado_en: ahora,
      finalizado_payload: clonarSerializable(payload)
    };
  } else {
    return {
      ok: true,
      saltado: true,
      mensaje: `El modo ${modoNormalizado || "SIN_MODO"} no cambia el estado del operativo de ensayo.`
    };
  }

  estado.actualizado_en = ahora;
  guardarEstadoEnsayo(estado);

  return {
    ok: true,
    modo: modoNormalizado,
    operativo_key: operativoKey,
    estado: estado.operativos[operativoKey].estado,
    resumen: obtenerResumenEstadoEnsayo(estado.guardia_fecha)
  };
}

export function obtenerResumenEstadoEnsayo(guardiaFecha) {
  const estado = cargarEstadoEnsayo(guardiaFecha);
  const items = Object.values(estado.operativos || {});

  return {
    guardia_fecha: estado.guardia_fecha,
    pendientes: items.filter((item) => item.estado === "PROGRAMADO").length,
    iniciados: items.filter((item) => item.estado === "EN_CURSO").length,
    finalizados: items.filter((item) => item.estado === "FINALIZADO").length,
    total: PROGRAMADOS_ENSAYO.length
  };
}

/** Reinicia únicamente los datos locales del ensayo. */
export function reiniciarEstadoEnsayo(guardiaFecha = "") {
  const nuevo = crearEstadoInicial(guardiaFecha);
  estadoMemoria = nuevo;
  escribirStorage(nuevo);
  return obtenerResumenEstadoEnsayo(nuevo.guardia_fecha);
}

function cargarEstadoEnsayo(guardiaFecha = "") {
  const guardia = String(guardiaFecha || "").trim();
  const guardado = leerStorage();

  if (estadoValido(guardado, guardia)) {
    estadoMemoria = repararEstado(guardado, guardia);
    return estadoMemoria;
  }

  if (estadoValido(estadoMemoria, guardia)) {
    estadoMemoria = repararEstado(estadoMemoria, guardia);
    return estadoMemoria;
  }

  estadoMemoria = crearEstadoInicial(guardia);
  escribirStorage(estadoMemoria);
  return estadoMemoria;
}

function guardarEstadoEnsayo(estado) {
  estadoMemoria = repararEstado(estado, estado?.guardia_fecha || "");
  escribirStorage(estadoMemoria);
}

function crearEstadoInicial(guardiaFecha) {
  const ahora = new Date().toISOString();
  const operativos = {};

  PROGRAMADOS_ENSAYO.forEach((base) => {
    operativos[base.operativo_key] = crearEstadoOperativoInicial(base);
  });

  return {
    version: VERSION_ESTADO,
    guardia_fecha: String(guardiaFecha || "").trim(),
    creado_en: ahora,
    actualizado_en: ahora,
    operativos
  };
}

function crearEstadoOperativoInicial(base) {
  return {
    operativo_key: base.operativo_key,
    estado: "PROGRAMADO",
    inicio_en: null,
    inicio_payload: null,
    finalizado_en: null,
    finalizado_payload: null
  };
}

function repararEstado(estado, guardiaFecha) {
  const copia = clonarSerializable(estado) || crearEstadoInicial(guardiaFecha);
  copia.version = VERSION_ESTADO;
  copia.guardia_fecha = String(guardiaFecha || copia.guardia_fecha || "").trim();
  copia.operativos = copia.operativos && typeof copia.operativos === "object"
    ? copia.operativos
    : {};

  PROGRAMADOS_ENSAYO.forEach((base) => {
    const previo = copia.operativos[base.operativo_key];
    copia.operativos[base.operativo_key] = {
      ...crearEstadoOperativoInicial(base),
      ...(previo && typeof previo === "object" ? previo : {}),
      operativo_key: base.operativo_key,
      estado: normalizarEstado(previo?.estado)
    };
  });

  // Descarta claves antiguas o ejemplos que ya no pertenecen al catálogo actual.
  copia.operativos = Object.fromEntries(
    PROGRAMADOS_ENSAYO.map((base) => [base.operativo_key, copia.operativos[base.operativo_key]])
  );

  return copia;
}

function materializarOperativos(estado) {
  return PROGRAMADOS_ENSAYO.map((base) => {
    const registro = estado.operativos[base.operativo_key] || crearEstadoOperativoInicial(base);
    const inicioPayload = registro.inicio_payload && typeof registro.inicio_payload === "object"
      ? registro.inicio_payload
      : {};

    return {
      ...base,
      guardia_fecha: estado.guardia_fecha || "",
      estado: normalizarEstado(registro.estado),
      origen: "ENSAYO_LOCAL",
      es_ensayo: true,
      inicio_evento_id: registro.estado === "EN_CURSO" || registro.estado === "FINALIZADO"
        ? `ensayo-inicio:${base.operativo_key}`
        : null,
      finalizado_evento_id: registro.estado === "FINALIZADO"
        ? `ensayo-finalizado:${base.operativo_key}`
        : null,
      inicio_payload: clonarSerializable(inicioPayload),
      personal: inicioPayload.personal || "",
      moviles_motos: inicioPayload.moviles_motos || "",
      elementos: inicioPayload.elementos || "",
      observaciones_inicio: inicioPayload.observaciones || "",
      datos: {
        ensayo: true,
        inicio_en: registro.inicio_en,
        finalizado_en: registro.finalizado_en,
        observacion: "Operativo local para validación funcional. No pertenece a Supabase."
      }
    };
  });
}

function estadoValido(estado, guardiaFecha) {
  if (!estado || typeof estado !== "object") return false;
  if (Number(estado.version) !== VERSION_ESTADO) return false;
  if (!estado.operativos || typeof estado.operativos !== "object") return false;

  const guardia = String(guardiaFecha || "").trim();
  const guardiaEstado = String(estado.guardia_fecha || "").trim();

  // Si conocemos la guardia y cambió, el ensayo arranca nuevamente con los
  // seis programados para no arrastrar pruebas de otra guardia.
  if (guardia && guardiaEstado && guardia !== guardiaEstado) return false;

  return true;
}

function normalizarEstado(valor) {
  const estado = String(valor || "PROGRAMADO").trim().toUpperCase().replace(/\s+/g, "_");

  if (["EN_CURSO", "INICIADO", "ACTIVO"].includes(estado)) return "EN_CURSO";
  if (["FINALIZADO", "CERRADO"].includes(estado)) return "FINALIZADO";
  return "PROGRAMADO";
}

function normalizarModo(valor) {
  return String(valor || "").trim().toUpperCase().replaceAll("-", "_").replace(/\s+/g, "_");
}

function leerStorage() {
  try {
    if (!storageEnsayo) return null;
    return JSON.parse(storageEnsayo.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function escribirStorage(estado) {
  try {
    if (!storageEnsayo) return;
    storageEnsayo.setItem(STORAGE_KEY, JSON.stringify(estado));
  } catch {}
}

function clonarSerializable(valor) {
  try {
    return JSON.parse(JSON.stringify(valor ?? null));
  } catch {
    return valor ?? null;
  }
}
