import { supabaseDisponible } from "../../infraestructura/supabase/supabase-client.js";
import {
  listarOperativosEnCursoActuales,
  listarOperativosFinalizadosActuales
} from "../../infraestructura/supabase/operativos-produccion-lectura-repo.js";
import { listarOperativosProgramadosV2 } from "../../infraestructura/supabase/operativos-programados-v2-repo.js";
import { operativosProgramadosDisponibles } from "../../infraestructura/supabase/supabase-operativos-programados-client.js";
import { obtenerContextoOperativos, registrarFuenteOperativos } from "./operativos-contexto.js";
import { guardarOperativosEnCache } from "./operativos-cache.js";
import { obtenerGuardiaFecha0600 } from "../../dominio/compartido/fechas/guardia-0600.js";
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

  const fuenteDisponible = modoNormalizado === "INICIA"
    ? operativosProgramadosDisponibles()
    : supabaseDisponible();

  if (fuenteDisponible) {
    try {
      const operativos = await obtenerOperativosDesdeSupabase({
        modo: modoNormalizado,
        guardiaFecha
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
          ? "SUPABASE_NUEVO_PROGRAMADOS_V2"
          : "SUPABASE_ACTUAL"
      });

      return normalizados;
    } catch (error) {
      console.error("[Informes_GP] Falló la lectura real de operativos desde Supabase.", error);
      registrarFuenteOperativos({ modo: modoNormalizado, fuente: "ERROR_SUPABASE" });
    }
  } else {
    console.error("[Informes_GP] Supabase no está disponible. No se usarán contadores de demostración.");
    registrarFuenteOperativos({ modo: modoNormalizado, fuente: "SIN_SUPABASE" });
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
    const programados = await listarOperativosProgramadosV2({
      guardia_fecha: guardiaFecha,
      activo: true,
      excluir_sin_efecto: true
    });

    // Durante esta primera etapa de migración, los PROGRAMADOS vienen
    // exclusivamente del proyecto nuevo. El estado histórico se consulta solo
    // como compatibilidad para no volver a ofrecer un operativo ya iniciado.
    // Si esa lectura histórica falla, NO se bloquea la lista del Supabase nuevo.
    let enCurso = [];
    let finalizados = [];

    if (supabaseDisponible()) {
      try {
        enCurso = await listarOperativosEnCursoActuales({
          guardia_fecha: guardiaFecha
        });
      } catch (error) {
        console.warn("[Informes_GP] No se pudo leer EN CURSO histórico para filtrar INICIA:", error);
      }

      try {
        finalizados = await listarOperativosFinalizadosActuales({
          guardia_fecha: guardiaFecha
        });
      } catch (error) {
        console.warn("[Informes_GP] No se pudieron leer FINALIZADOS históricos para filtrar INICIA:", error);
      }
    }

    return filtrarProgramadosPendientes({
      programados,
      enCurso,
      finalizados
    });
  }

  if (modo === "FINALIZA") {
    const enCurso = await listarOperativosEnCursoActuales({
      guardia_fecha: guardiaFecha
    });

    // FINALIZA conserva el estado del circuito actual, pero la fecha que se
    // imprime debe ser la fecha programada del nuevo Supabase. Solo se
    // enriquece fecha_operativo por operativo_key; no se cambia ningún otro dato.
    if (operativosProgramadosDisponibles()) {
      try {
        const programados = await listarOperativosProgramadosV2({
          guardia_fecha: guardiaFecha,
          activo: true,
          excluir_sin_efecto: false
        });
        return enriquecerFechaOperativoDesdeProgramacion(enCurso, programados);
      } catch (error) {
        console.warn("[Informes_GP] No se pudo recuperar fecha_operativo del Supabase nuevo para FINALIZA:", error);
      }
    }

    return enCurso;
  }

  if (modo === "INFORMES") {
    return listarOperativosEnCursoActuales({
      guardia_fecha: guardiaFecha
    });
  }

  return [];
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

  return normalizarOperativos(operativos);
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
  const fechasPorKey = new Map(
    normalizarOperativos(programados)
      .filter((op) => op.operativo_key && op.fecha_operativo)
      .map((op) => [op.operativo_key, String(op.fecha_operativo).trim()])
  );

  return normalizarOperativos(enCurso).map((op) => ({
    ...op,
    fecha_operativo: fechasPorKey.get(op.operativo_key) || String(op.fecha_operativo || "").trim()
  }));
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
