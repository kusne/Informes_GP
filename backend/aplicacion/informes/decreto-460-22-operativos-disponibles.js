// Vinculación exclusiva para Decreto 460/22: sólo operativos de la guardia
// habilitada por BMZCN Desktop. No modifica la lógica de otros informes.
import { listarEstadosOperativosRestRapido } from "../../infraestructura/supabase/supabase-rest-rapido.js";
import { obtenerGuardiaFecha0600 } from "../../dominio/compartido/fechas/guardia-0600.js";
import { modoEnsayoActivo } from "../../infraestructura/ensayo/modo-ensayo.js";
import { obtenerOperativosEnsayoPorModo } from "../../infraestructura/ensayo/operativos-ensayo.js";

const URL_SUPABASE = "https://hbnxvwrqxhurdteirsyl.supabase.co";
const CLAVE_PUBLICA = "sb_publishable_GgrICSZSYl6Fc5D8SzT-aA_GLCB9J01";
const TABLA_ESTADO_RESUMIDO = "bmzcn_guardias_estado_informes_gp_v1";
const ESTADOS_HABILITADOS = new Set(["VIGENTE", "EXTENDIDA"]);

export function resolverGuardiaDisponible46022(filas = []) {
  const registros = Array.isArray(filas) ? filas
    .filter((fila) => /^\d{4}-\d{2}-\d{2}$/.test(String(fila?.guardia_fecha || "")))
    .map((fila) => ({
      guardiaFecha: fila.guardia_fecha,
      estado: String(fila?.estado || "").trim().toUpperCase()
    }))
    .sort((a, b) => a.guardiaFecha.localeCompare(b.guardiaFecha)) : [];

  // Desktop da prioridad a la guardia anterior no cerrada; no confundir
  // cambio de fecha a las 06:00 con cierre efectivo de sesión.
  const pendiente = registros.find((fila) => fila.estado !== "FINALIZADA");
  if (pendiente) return {
    guardiaFecha: pendiente.guardiaFecha,
    estado: pendiente.estado,
    habilitada: ESTADOS_HABILITADOS.has(pendiente.estado)
  };
  return {
    guardiaFecha: "",
    estado: registros.length ? "FINALIZADA" : "SIN_GUARDIA",
    habilitada: false
  };
}

function fechaISO(fecha) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

export async function consultarEstadoGuardia46022({
  consultar = globalThis.fetch,
  ahora = new Date()
} = {}) {
  const limite = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 7);
  const url = new URL(`/rest/v1/${TABLA_ESTADO_RESUMIDO}`, URL_SUPABASE);
  url.searchParams.set("select", "guardia_fecha,estado");
  url.searchParams.set("guardia_fecha", `gte.${fechaISO(limite)}`);
  url.searchParams.set("order", "guardia_fecha.asc");

  const respuesta = await consultar(url.toString(), {
    method: "GET",
    headers: { apikey: CLAVE_PUBLICA, Accept: "application/json" },
    credentials: "omit",
    cache: "no-store"
  });
  if (!respuesta.ok) throw new Error(`No se pudo confirmar la guardia en Desktop (${respuesta.status}).`);
  const filas = await respuesta.json();
  if (!Array.isArray(filas)) throw new Error("Estado de guardia inválido.");
  return resolverGuardiaDisponible46022(filas);
}

export async function obtenerOperativosDisponibles46022({
  consultar = globalThis.fetch,
  leerOperativos = listarEstadosOperativosRestRapido,
  ahora = new Date(),
  ensayo = modoEnsayoActivo()
} = {}) {
  if (ensayo) {
    const fecha = obtenerGuardiaFecha0600(ahora);
    return {
      estado: "ENSAYO_LOCAL",
      guardiaFecha: fecha,
      operativos: seleccionarOperativosGuardia46022(
        obtenerOperativosEnsayoPorModo("DECRETO_460_22", fecha), fecha
      )
    };
  }

  try {
    const guardia = await consultarEstadoGuardia46022({ consultar, ahora });
    if (!guardia.habilitada) {
      return { estado: guardia.estado, guardiaFecha: guardia.guardiaFecha, operativos: [] };
    }
    const operativos = await leerOperativos({ guardia_fecha: guardia.guardiaFecha });
    // No importar últimos operativos globales de una guardia ya terminada.
    return {
      estado: guardia.estado,
      guardiaFecha: guardia.guardiaFecha,
      operativos: seleccionarOperativosGuardia46022(operativos, guardia.guardiaFecha)
    };
  } catch (error) {
    console.warn("[460/22] Estado de guardia sin verificar; selector bloqueado.", error);
    // Fallar cerrado: nunca recuperar operativos históricos de caché.
    return { estado: "SIN_VERIFICAR", guardiaFecha: "", operativos: [] };
  }
}

// Exclusivo Decreto 460/22: todos los EN CURSO (incluido procedimiento)
// y los dos últimos FINALIZADOS, siempre de la guardia actualmente vigente.
// Se excluyen programados, suspendidos y guardias históricas.
const ESTADOS_ABIERTOS_46022 = new Set(["EN_CURSO", "EN_PROCEDIMIENTO", "INICIADO", "ACTIVO"]);

export function seleccionarOperativosGuardia46022(operativos = [], guardiaFecha = "") {
  const fecha = String(guardiaFecha || "").trim();
  if (!fecha || !Array.isArray(operativos)) return [];

  const unicos = new Map();
  for (const op of operativos) {
    if (!op || String(op.guardia_fecha || "").trim() !== fecha) continue;
    const clave = String(op.operativo_key || "").trim();
    const estado = estadoOperativo46022(op);
    if (!clave || (!ESTADOS_ABIERTOS_46022.has(estado) && estado !== "FINALIZADO")) continue;
    const previo = unicos.get(clave);
    if (!previo || fechaModificacion46022(op) >= fechaModificacion46022(previo)) {
      unicos.set(clave, op);
    }
  }

  const filas = Array.from(unicos.values());
  const enCurso = filas
    .filter(op => ESTADOS_ABIERTOS_46022.has(estadoOperativo46022(op)))
    .sort((a, b) => fechaInicio46022(b) - fechaInicio46022(a));
  const finalizados = filas
    .filter(op => estadoOperativo46022(op) === "FINALIZADO")
    .sort((a, b) => fechaFinalizado46022(b) - fechaFinalizado46022(a))
    .slice(0, 2);

  return [...enCurso, ...finalizados];
}

function estadoOperativo46022(op) {
  return String(op?.estado || "").trim().toUpperCase().replace(/\s+/g, "_");
}

function fechaTimestamp46022(...valores) {
  for (const valor of valores) {
    const marca = Date.parse(String(valor || ""));
    if (Number.isFinite(marca)) return marca;
  }
  return 0;
}

function fechaModificacion46022(op) {
  return fechaTimestamp46022(op?.updated_at, op?.fecha_evento, op?.created_at);
}

function fechaInicio46022(op) {
  return fechaTimestamp46022(op?.created_at, op?.inicio_created_at, op?.fecha_evento, op?.updated_at);
}

function fechaFinalizado46022(op) {
  return fechaTimestamp46022(
    op?.finalizado_at, op?.finalizado_en, op?.datos?.finalizado_en,
    op?.fecha_evento, op?.updated_at, op?.created_at
  );
}
