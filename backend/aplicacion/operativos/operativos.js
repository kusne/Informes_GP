import { supabaseDisponible } from "../../infraestructura/supabase/supabase-client.js";
import {
  listarOperativosPublicadosActuales,
  listarOperativosEnCursoActuales,
  listarOperativosFinalizadosActuales
} from "../../infraestructura/supabase/operativos-produccion-lectura-repo.js";
import { obtenerContextoOperativos, registrarFuenteOperativos } from "./operativos-contexto.js";
import { guardarOperativosEnCache } from "./operativos-cache.js";
import { obtenerGuardiaFecha0600 } from "../../dominio/compartido/fechas/guardia-0600.js";

const OPERATIVOS_PROGRAMADOS_DEMO = [
  {
    operativo_key: "demo-ocv-rn168-rp1-0630",
    guardia_fecha: "",
    hora_inicio: "06:30",
    hora_fin: "08:00",
    lugar: "RN 168 Y RP 1",
    tipo_operativo: "OCV",
    tipo_nombre: "OCV",
    estado: "PROGRAMADO"
  },
  {
    operativo_key: "demo-ocv-dicep-tunel-0700",
    guardia_fecha: "",
    hora_inicio: "07:00",
    hora_fin: "09:30",
    lugar: "RN 168 KM18 TÚNEL SUBFLUVIAL",
    tipo_operativo: "OCV_DICEP",
    tipo_nombre: "OCV + DICEP",
    estado: "PROGRAMADO"
  },
  {
    operativo_key: "demo-presencia-puente-0000",
    guardia_fecha: "",
    hora_inicio: "00:00",
    hora_fin: "06:00",
    lugar: "PUENTE CARRETERO",
    tipo_operativo: "PRESENCIA_ACTIVA",
    tipo_nombre: "PRESENCIA ACTIVA",
    estado: "PROGRAMADO"
  },
  {
    operativo_key: "demo-patrullaje-rp1-1600",
    guardia_fecha: "",
    hora_inicio: "16:00",
    hora_fin: "18:00",
    lugar: "RP 1 DEL KM 00 AL 25",
    tipo_operativo: "PATRULLAJE",
    tipo_nombre: "PATRULLAJE",
    estado: "PROGRAMADO"
  },
  {
    operativo_key: "demo-control-peso-tunel-0700",
    guardia_fecha: "",
    hora_inicio: "07:00",
    hora_fin: "10:00",
    lugar: "RN 168 KM18 PEAJE TÚNEL SUBFLUVIAL",
    tipo_operativo: "CONTROL_PESO",
    tipo_nombre: "CONTROL DE PESO",
    estado: "PROGRAMADO"
  }
];

const OPERATIVOS_INICIADOS_DEMO = [
  {
    operativo_key: "demo-ocv-rn168-rp1-0630",
    guardia_fecha: "",
    hora_inicio: "06:30",
    hora_fin: "08:00",
    lugar: "RN 168 Y RP 1",
    tipo_operativo: "OCV",
    tipo_nombre: "OCV",
    estado: "EN_CURSO"
  },
  {
    operativo_key: "demo-ocv-dicep-tunel-0700",
    guardia_fecha: "",
    hora_inicio: "07:00",
    hora_fin: "09:30",
    lugar: "RN 168 KM18 TÚNEL SUBFLUVIAL",
    tipo_operativo: "OCV_DICEP",
    tipo_nombre: "OCV + DICEP",
    estado: "EN_CURSO"
  }
];

export async function obtenerOperativosPorModo(modo, opciones = {}) {
  const modoNormalizado = normalizarModo(modo);
  const contexto = obtenerContextoOperativos();
  const guardiaFecha = resolverGuardiaFecha(opciones, contexto);

  if (!modoNormalizado || modoNormalizado === "CONTROL_MOVILES") {
    registrarFuenteOperativos({ modo: modoNormalizado, fuente: "VACIO" });
    return [];
  }

  if (supabaseDisponible()) {
    try {
      const operativos = await obtenerOperativosDesdeSupabase({
        modo: modoNormalizado,
        guardiaFecha
      });

      const normalizados = normalizarOperativos(operativos);

      guardarOperativosEnCache({
        modo: modoNormalizado,
        guardiaFecha,
        operativos: normalizados
      });

      registrarFuenteOperativos({ modo: modoNormalizado, fuente: "SUPABASE_ACTUAL" });

      return normalizados;
    } catch (error) {
      console.error("[Informes_GP] Falló la lectura real de operativos desde Supabase.", error);
      registrarFuenteOperativos({ modo: modoNormalizado, fuente: "ERROR_SUPABASE" });
    }
  } else {
    console.error("[Informes_GP] Supabase no está disponible. No se usarán contadores de demostración.");
    registrarFuenteOperativos({ modo: modoNormalizado, fuente: "SIN_SUPABASE" });
  }

  if (modoDemoHabilitado(opciones)) {
    const demo = obtenerOperativosDemoPorModo(modoNormalizado, guardiaFecha);

    guardarOperativosEnCache({
      modo: modoNormalizado,
      guardiaFecha,
      operativos: demo
    });

    registrarFuenteOperativos({ modo: modoNormalizado, fuente: "DEMO_EXPLICITO" });
    return demo;
  }

  guardarOperativosEnCache({
    modo: modoNormalizado,
    guardiaFecha,
    operativos: []
  });

  return [];
}

async function obtenerOperativosDesdeSupabase({ modo, guardiaFecha }) {
  if (modo === "INICIA") {
    const programados = await listarOperativosPublicadosActuales({
      guardia_fecha: guardiaFecha
    });

    const enCurso = await listarOperativosEnCursoActuales({
      guardia_fecha: guardiaFecha
    });

    let finalizados = [];

    try {
      finalizados = await listarOperativosFinalizadosActuales({
        guardia_fecha: guardiaFecha
      });
    } catch (error) {
      console.warn("[Informes_GP] No se pudieron leer finalizados para filtrar INICIA:", error);
      finalizados = [];
    }

    return filtrarProgramadosPendientes({
      programados,
      enCurso,
      finalizados
    });
  }

  if (modo === "FINALIZA" || modo === "INFORMES") {
    return listarOperativosEnCursoActuales({
      guardia_fecha: guardiaFecha
    });
  }

  return [];
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
  const modoNormalizado = normalizarModo(modo);

  if (modoNormalizado === "INICIA") {
    return normalizarOperativos(conGuardiaFecha(OPERATIVOS_PROGRAMADOS_DEMO, guardiaFecha));
  }

  if (modoNormalizado === "FINALIZA" || modoNormalizado === "INFORMES") {
    return normalizarOperativos(conGuardiaFecha(OPERATIVOS_INICIADOS_DEMO, guardiaFecha));
  }

  return [];
}

export function formatearOperativoParaSelector(operativo) {
  if (!operativo) return "";

  const hora = `${operativo.hora_inicio || "--:--"} A ${operativo.hora_fin || "--:--"}`;
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
    hora_fin: String(horaFin || "").trim(),
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

function conGuardiaFecha(operativos, guardiaFecha) {
  return operativos.map((op) => ({
    ...op,
    guardia_fecha: guardiaFecha || op.guardia_fecha || obtenerGuardiaFecha0600()
  }));
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
  return matches.length >= 2 ? matches[1][1] : "";
}
function modoDemoHabilitado(opciones = {}) {
  if (opciones.modoDemo === true || opciones.demo === true) return true;

  try {
    if (window.InformesGP?.modoDemo === true) return true;
    return new URLSearchParams(window.location.search).get("demo") === "1";
  } catch {
    return false;
  }
}
