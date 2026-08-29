import {
  obtenerEstadoInformes,
  establecerEstadoInformes
} from "./informes-state.js";

export function resolverPrefijoFotoPorModoPayload({ modo, payload } = {}) {
  const modoNormalizado = normalizarModo(modo);

  if (payload?.foto_prefijo) return String(payload.foto_prefijo || "").trim();
  if (modoNormalizado === "INICIA") return `inicio-${slugTipo(payload?.tipo_operativo)}`;
  if (modoNormalizado === "FINALIZA") return `finaliza-${slugTipo(payload?.tipo_operativo)}`;

  if (modoNormalizado === "INFORMES") {
    const tipoInforme = normalizarModo(payload?.tipo_informe);
    if (tipoInforme === "DECRETO_460_22") return "decreto-460-22";
    if (tipoInforme === "RETENCION_LICENCIA") return "retencion-licencia";
  }

  return "";
}

export function obtenerFotosPorPrefijo(prefijo) {
  const key = String(prefijo || "").trim();
  if (!key) return [];
  const fotosEstado = obtenerEstadoInformes()?.fotos?.[key];
  return Array.isArray(fotosEstado) ? fotosEstado : [];
}

export function limpiarFotosPorPrefijo(prefijo) {
  const key = String(prefijo || "").trim();
  if (!key) return [];

  const estado = obtenerEstadoInformes();
  establecerEstadoInformes({
    fotos: {
      ...(estado.fotos || {}),
      [key]: []
    }
  });
  return [];
}

export function limpiarFotosPorModoPayload({ modo, payload } = {}) {
  const prefijo = resolverPrefijoFotoPorModoPayload({ modo, payload });
  limpiarFotosPorPrefijo(prefijo);
  return prefijo;
}

export function limpiarTodasLasFotosMemoria() {
  const estado = obtenerEstadoInformes();
  const fotos = Object.fromEntries(Object.keys(estado?.fotos || {}).map((key) => [key, []]));
  establecerEstadoInformes({ fotos });
  return fotos;
}

function slugTipo(valor) {
  const tipo = normalizarModo(valor || "GENERICO");
  const mapa = {
    OCV: "ocv",
    OCV_DICEP: "ocv-dicep",
    PRESENCIA_ACTIVA: "presencia-activa",
    PATRULLAJE: "patrullaje",
    CONTROL_PESO: "control-peso",
    GENERICO: "generico"
  };
  return mapa[tipo] || "generico";
}

function normalizarModo(valor) {
  return String(valor || "").trim().toUpperCase().replaceAll("-", "_").replace(/\s+/g, "_");
}
