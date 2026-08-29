import {
  listarEstadosOperativosRestRapido,
  listarUltimosEstadosOperativosRestRapido,
  listarOperativosProgramadosRestRapido
} from "../../infraestructura/supabase/supabase-rest-rapido.js";
import { obtenerContextoOperativos, registrarFuenteOperativos } from "./operativos-contexto.js";
import { guardarOperativosEnCache, obtenerOperativosDesdeCache } from "./operativos-cache.js";
import {
  obtenerGuardiaFecha0600,
  obtenerFinGuardia0600,
  parsearFechaISO,
  formatearFechaISO
} from "../../dominio/compartido/fechas/guardia-0600.js";
import { modoEnsayoActivo } from "../../infraestructura/ensayo/modo-ensayo.js";
import { obtenerOperativosEnsayoPorModo } from "../../infraestructura/ensayo/operativos-ensayo.js";


export async function obtenerOperativosPorModo(modo, opciones = {}) {
  const modoNormalizado = normalizarModo(modo);
  const contexto = obtenerContextoOperativos();
  const guardiaFecha = resolverGuardiaFecha(opciones, contexto);

  if (!modoNormalizado || modoNormalizado === "CONTROL_MOVILES") {
    registrarFuenteOperativos({ modo: modoNormalizado, fuente: "VACIO" });
    return [];
  }

  if (modoEnsayoActivo(opciones)) {
    const ensayoNormalizado = normalizarOperativos(
      obtenerOperativosEnsayoPorModo(modoNormalizado, guardiaFecha)
    );
    const ensayo = filtrarSegunModo(modoNormalizado, ensayoNormalizado);

    guardarOperativosEnCache({
      modo: modoNormalizado,
      guardiaFecha,
      operativos: ensayo
    });

    registrarFuenteOperativos({ modo: modoNormalizado, fuente: "ENSAYO_LOCAL" });
    return ensayo;
  }

  try {
    const operativos = await obtenerOperativosDesdeSupabase({
      modo: modoNormalizado,
      guardiaFecha,
      ahora: opciones.ahora instanceof Date ? opciones.ahora : new Date()
    });

    const normalizados = filtrarSegunModo(
      modoNormalizado,
      normalizarOperativos(operativos)
    );

    guardarOperativosEnCache({
      modo: modoNormalizado,
      guardiaFecha,
      operativos: normalizados
    });

    registrarFuenteOperativos({
      modo: modoNormalizado,
      fuente: modoNormalizado === "INICIA"
        ? "SUPABASE_REST_RAPIDO_PROGRAMADOS_V2"
        : "SUPABASE_REST_RAPIDO_ESTADO_V2"
    });

    return normalizados;
  } catch (error) {
    console.error("[Informes_GP] Falló la lectura rápida de operativos desde el Supabase nuevo.", error);
    registrarFuenteOperativos({ modo: modoNormalizado, fuente: "ERROR_SUPABASE_REST" });
  }

  // Una falla momentánea de red no debe convertir visualmente los operativos
  // en una lista vacía. Se conserva la última lectura válida de esta guardia.
  const cache = obtenerOperativosDesdeCache({
    modo: modoNormalizado,
    guardiaFecha
  });

  registrarFuenteOperativos({
    modo: modoNormalizado,
    fuente: "CACHE_TRAS_ERROR_SUPABASE"
  });

  return cache;
}

async function obtenerOperativosDesdeSupabase({ modo, guardiaFecha, ahora = new Date() }) {
  if (modo === "INICIA") {
    // PROGRAMADOS y ESTADO pertenecen al mismo proyecto nuevo.
    // Se leen en paralelo para reducir el tiempo de carga y evitar el circuito legacy.
    const [programadosResultado, estadosResultado] = await Promise.allSettled([
      listarOperativosProgramadosRestRapido({
        guardia_fecha: guardiaFecha,
        activo: true,
        excluir_sin_efecto: true
      }),
      listarEstadosOperativosRestRapido({
        guardia_fecha: guardiaFecha
      })
    ]);

    if (programadosResultado.status !== "fulfilled") {
      throw programadosResultado.reason;
    }

    const programados = programadosResultado.value || [];
    const estados = estadosResultado.status === "fulfilled"
      ? estadosResultado.value || []
      : [];

    if (estadosResultado.status !== "fulfilled") {
      console.warn("[Informes_GP] No se pudo leer bmzcn_operativos_estado_v2 para filtrar INICIA:", estadosResultado.reason);
    }

    const enCurso = estados.filter((op) => normalizarEstado(op?.estado) === "EN_CURSO");
    const finalizados = estados.filter((op) => normalizarEstado(op?.estado) === "FINALIZADO");

    return filtrarProgramadosPendientes({
      programados,
      enCurso,
      finalizados
    });
  }

  if (modo === "FINALIZA") {
    // Regla operativa:
    // - siempre se muestran los EN_CURSO de la guardia actual;
    // - durante las 6 horas posteriores al cierre teórico de la guardia anterior
    //   (06:00 -> 12:00), también se conservan sus EN_CURSO pendientes.
    // Esto permite finalizar una novedad de la guardia saliente sin dejarla
    // disponible indefinidamente.
    const incluirGuardiaAnterior = debeIncluirGuardiaAnteriorFinaliza({
      guardiaFecha,
      ahora
    });
    const guardiaAnterior = incluirGuardiaAnterior
      ? obtenerGuardiaAnterior(guardiaFecha)
      : "";

    const promesas = [
      listarEstadosOperativosRestRapido({
        guardia_fecha: guardiaFecha
      }),
      listarOperativosProgramadosRestRapido({
        guardia_fecha: guardiaFecha,
        activo: true,
        excluir_sin_efecto: false
      })
    ];

    if (guardiaAnterior) {
      promesas.push(
        listarEstadosOperativosRestRapido({
          guardia_fecha: guardiaAnterior
        }),
        listarOperativosProgramadosRestRapido({
          guardia_fecha: guardiaAnterior,
          activo: true,
          excluir_sin_efecto: false
        })
      );
    }

    const resultados = await Promise.allSettled(promesas);
    const estadosActualResultado = resultados[0];
    const programadosActualResultado = resultados[1];

    if (estadosActualResultado.status !== "fulfilled") {
      throw estadosActualResultado.reason;
    }

    const enCursoActual = (estadosActualResultado.value || [])
      .filter((op) => normalizarEstado(op?.estado) === "EN_CURSO");

    const actualEnriquecido = programadosActualResultado.status === "fulfilled"
      ? enriquecerFechaOperativoDesdeProgramacion(
          enCursoActual,
          programadosActualResultado.value || []
        )
      : enCursoActual;

    if (programadosActualResultado.status !== "fulfilled") {
      console.warn(
        "[Informes_GP] No se pudo recuperar fecha_operativo de la guardia actual para FINALIZA:",
        programadosActualResultado.reason
      );
    }

    if (!guardiaAnterior) {
      return actualEnriquecido;
    }

    const estadosAnteriorResultado = resultados[2];
    const programadosAnteriorResultado = resultados[3];

    if (estadosAnteriorResultado.status !== "fulfilled") {
      console.warn(
        "[Informes_GP] No se pudieron recuperar EN_CURSO de la guardia anterior para FINALIZA:",
        estadosAnteriorResultado.reason
      );
      return actualEnriquecido;
    }

    const enCursoAnterior = (estadosAnteriorResultado.value || [])
      .filter((op) => normalizarEstado(op?.estado) === "EN_CURSO");

    const anteriorEnriquecido = programadosAnteriorResultado.status === "fulfilled"
      ? enriquecerFechaOperativoDesdeProgramacion(
          enCursoAnterior,
          programadosAnteriorResultado.value || []
        )
      : enCursoAnterior;

    if (programadosAnteriorResultado.status !== "fulfilled") {
      console.warn(
        "[Informes_GP] No se pudo recuperar fecha_operativo de la guardia anterior para FINALIZA:",
        programadosAnteriorResultado.reason
      );
    }

    return combinarOperativosSinDuplicar([
      ...actualEnriquecido,
      ...anteriorEnriquecido
    ]);
  }

  if (modo === "INFORMES") {
    // INFORMES no depende de la guardia actual ni de que el operativo siga
    // EN_CURSO. La tabla de estado conserva una fila desde el primer INICIO y
    // created_at no cambia cuando luego se FINALIZA. Por eso podemos traer de
    // forma directa los dos últimos INICIOS reales, incluso de la guardia
    // anterior si todavía son los más recientes.
    return listarUltimosEstadosOperativosRestRapido({ limite: 2 });
  }

  return [];
}


function debeIncluirGuardiaAnteriorFinaliza({ guardiaFecha, ahora = new Date() } = {}) {
  const guardiaAnterior = obtenerGuardiaAnterior(guardiaFecha);
  if (!guardiaAnterior) return false;

  try {
    const cierreTeorico = obtenerFinGuardia0600(guardiaAnterior);
    const limite = new Date(cierreTeorico.getTime() + (6 * 60 * 60 * 1000));
    const momento = ahora instanceof Date ? ahora : new Date(ahora);

    if (Number.isNaN(momento.getTime())) return false;

    return momento >= cierreTeorico && momento < limite;
  } catch {
    return false;
  }
}

function obtenerGuardiaAnterior(guardiaFecha) {
  try {
    const fecha = parsearFechaISO(String(guardiaFecha || "").trim());
    fecha.setDate(fecha.getDate() - 1);
    return formatearFechaISO(fecha);
  } catch {
    return "";
  }
}

function combinarOperativosSinDuplicar(operativos = []) {
  const mapa = new Map();

  for (const operativo of normalizarOperativos(operativos)) {
    const clave = `${operativo.guardia_fecha || ""}::${operativo.operativo_key || ""}`;
    if (!operativo.operativo_key || mapa.has(clave)) continue;
    mapa.set(clave, operativo);
  }

  return Array.from(mapa.values());
}

function normalizarEstado(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}


export function filtrarOperativosIniciadosParaFinalizar(operativos = []) {
  return normalizarOperativos(operativos).filter((op) => {
    const estado = String(op?.estado || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");

    if (op?.finalizado_evento_id) return false;
    if (["FINALIZADO", "CERRADO"].includes(estado)) return false;

    return ["EN_CURSO", "INICIADO", "ACTIVO"].includes(estado) ||
      Boolean(op?.inicio_evento_id);
  });
}

function filtrarSegunModo(modo, operativos = []) {
  if (modo === "FINALIZA") {
    return filtrarOperativosIniciadosParaFinalizar(operativos);
  }

  if (modo === "INFORMES") {
    return seleccionarUltimosOperativosIniciados(operativos, 2);
  }

  return normalizarOperativos(operativos);
}

/**
 * Devuelve los últimos operativos que tuvieron un INICIO real. El estado
 * actual puede ser EN_CURSO o FINALIZADO. created_at representa la creación
 * de la fila de estado (momento del primer INICIO) y no cambia al finalizar.
 */
export function seleccionarUltimosOperativosIniciados(operativos = [], limite = 2) {
  const maximo = Math.max(0, Math.trunc(Number(limite) || 0));
  if (!maximo) return [];

  return normalizarOperativos(operativos)
    .filter((op) => fueIniciado(op))
    .sort((a, b) => marcaInicio(b) - marcaInicio(a))
    .slice(0, maximo);
}

function fueIniciado(op = {}) {
  const estado = normalizarEstado(op?.estado);
  const tipoEvento = normalizarEstado(op?.tipo_evento);
  const datos = op?.datos && typeof op.datos === "object" ? op.datos : {};

  return Boolean(
    op?.inicio_evento_id ||
    op?.created_at ||
    datos?.inicio_snapshot ||
    ["INICIO", "FINALIZADO"].includes(tipoEvento) ||
    ["EN_CURSO", "INICIADO", "ACTIVO", "FINALIZADO", "CERRADO"].includes(estado)
  );
}

function marcaInicio(op = {}) {
  const datos = op?.datos && typeof op.datos === "object" ? op.datos : {};
  const snapshot = datos?.inicio_snapshot && typeof datos.inicio_snapshot === "object"
    ? datos.inicio_snapshot
    : {};

  for (const valor of [
    op?.created_at,
    op?.inicio_created_at,
    snapshot?.fecha_evento,
    op?.inicio_evento_at,
    op?.fecha_evento
  ]) {
    const t = Date.parse(String(valor || ""));
    if (Number.isFinite(t)) return t;
  }

  // Fallback estable si una instalación antigua no conserva timestamps.
  const guardia = Date.parse(String(op?.guardia_fecha || ""));
  const [hh, mm] = String(op?.hora_inicio || "").split(":").map(Number);
  if (Number.isFinite(guardia)) {
    return guardia + (Number.isFinite(hh) ? hh : 0) * 3600000 + (Number.isFinite(mm) ? mm : 0) * 60000;
  }

  return 0;
}

export function filtrarProgramadosPendientes({
  programados = [],
  enCurso = [],
  finalizados = []
} = {}) {
  const keysNoDisponibles = new Set([
    ...normalizarOperativos(enCurso).map((op) => op.operativo_key),
    ...normalizarOperativos(finalizados).map((op) => op.operativo_key)
  ]);

  return normalizarOperativos(programados)
    .filter((op) => !keysNoDisponibles.has(op.operativo_key));
}

export function obtenerOperativosDemoPorModo(modo, guardiaFecha = obtenerGuardiaFecha0600()) {
  return normalizarOperativos(obtenerOperativosEnsayoPorModo(modo, guardiaFecha));
}

export function enriquecerFechaOperativoDesdeProgramacion(enCurso = [], programados = []) {
  const programadosPorKey = new Map(
    normalizarOperativos(programados)
      .filter((op) => op.operativo_key)
      .map((op) => [op.operativo_key, op])
  );

  return normalizarOperativos(enCurso).map((op) => {
    const programado = programadosPorKey.get(op.operativo_key) || null;
    if (!programado) return op;

    const ordenesProgramadas = Array.isArray(programado.ordenes_origen)
      ? programado.ordenes_origen.filter(Boolean)
      : [];

    return {
      ...op,
      fecha_operativo: String(programado.fecha_operativo || op.fecha_operativo || "").trim(),
      tipo_nombre: String(programado.tipo_nombre || programado.tipo_original || op.tipo_nombre || op.tipo_operativo || "OPERATIVO").trim(),
      tipo_original: String(programado.tipo_original || programado.tipo_nombre || op.tipo_original || "").trim(),
      ordenes_origen: ordenesProgramadas.length
        ? ordenesProgramadas
        : (Array.isArray(op.ordenes_origen) ? op.ordenes_origen : []),
      datos: {
        ...(op.datos && typeof op.datos === "object" ? op.datos : {}),
        fecha_operativo: String(programado.fecha_operativo || op.fecha_operativo || "").trim(),
        tipo_nombre: String(programado.tipo_nombre || programado.tipo_original || op.tipo_nombre || op.tipo_operativo || "OPERATIVO").trim(),
        ordenes_origen: ordenesProgramadas.length
          ? ordenesProgramadas
          : (Array.isArray(op?.datos?.ordenes_origen) ? op.datos.ordenes_origen : [])
      }
    };
  });
}

export function formatearOperativoParaSelector(operativo) {
  if (!operativo) return "";

  const fin = String(operativo.hora_fin || "--:--").trim();
  const hora = /FINALIZAR/i.test(fin)
    ? `${operativo.hora_inicio || "--:--"} A FINALIZAR`
    : `${operativo.hora_inicio || "--:--"} A ${fin}`;
  const lugar = operativo.lugar || "SIN LUGAR";
  const tipo = operativo.tipo_nombre || operativo.tipo_operativo || "OPERATIVO";

  return `${hora} - ${lugar} - ${tipo}`;
}

export function normalizarOperativos(operativos) {
  if (!Array.isArray(operativos)) return [];

  return operativos
    .map(normalizarOperativo)
    .filter((op) => op.operativo_key);
}

export function normalizarOperativo(op) {
  const operativoKey =
    op?.operativo_key ||
    op?.id_operativo ||
    op?.id ||
    construirKeyFallback(op);

  const horaInicio =
    op?.hora_inicio ||
    op?.inicio ||
    extraerHoraInicioDesdeFranja(op?.franja_horaria) ||
    "";

  const horaFin =
    op?.hora_fin ||
    op?.hora_finalizacion ||
    op?.fin ||
    extraerHoraFinDesdeFranja(op?.franja_horaria) ||
    "";

  const tipoOperativo =
    op?.tipo_operativo ||
    op?.tipo ||
    op?.tipo_codigo ||
    "GENERICO";

  return {
    ...op,
    operativo_key: String(operativoKey || "").trim(),
    guardia_fecha: String(op?.guardia_fecha || op?.fecha_guardia || op?.fecha || "").trim(),
    hora_inicio: String(horaInicio || "").trim(),
    hora_fin: normalizarHoraFinAbierta(horaFin),
    lugar: String(op?.lugar || op?.qth || op?.ubicacion || "SIN LUGAR").trim(),
    tipo_operativo: String(tipoOperativo || "GENERICO").trim().toUpperCase(),
    tipo_nombre: String(op?.tipo_nombre || op?.tipo_descripcion || tipoOperativo || "OPERATIVO").trim(),
    estado: String(op?.estado || "").trim().toUpperCase()
  };
}

function resolverGuardiaFecha(opciones = {}, contexto = {}) {
  return String(
    opciones.guardiaFecha ||
    opciones.guardia_fecha ||
    contexto.guardiaFecha ||
    obtenerGuardiaFecha0600() ||
    ""
  ).trim();
}

function normalizarModo(modo) {
  return String(modo || "").trim().toUpperCase();
}


function construirKeyFallback(op) {
  const partes = [
    op?.guardia_fecha || op?.fecha_guardia || op?.fecha || "",
    op?.hora_inicio || op?.inicio || "",
    op?.hora_fin || op?.hora_finalizacion || op?.fin || "",
    op?.lugar || op?.qth || op?.ubicacion || "",
    op?.tipo_operativo || op?.tipo || ""
  ];

  return partes
    .map((p) => String(p || "").trim().toLowerCase())
    .filter(Boolean)
    .join("-");
}

function extraerHoraInicioDesdeFranja(franja) {
  const texto = String(franja || "");
  const match = texto.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : "";
}

function extraerHoraFinDesdeFranja(franja) {
  const texto = String(franja || "");
  const matches = [...texto.matchAll(/(\d{1,2}:\d{2})/g)];
  if (matches.length >= 2) return matches[1][1];
  return /A\s+FINALIZAR/i.test(texto) ? "FINALIZAR" : "";
}

function normalizarHoraFinAbierta(valor) {
  const limpio = String(valor || "").trim();
  return /FINALIZAR/i.test(limpio) ? "FINALIZAR" : limpio;
}
