import {
  obtenerEstadoInformes,
  establecerEstadoInformes
} from "./informes-state.js";

export function resolverPrefijoFotoPorModoPayload({ modo, payload } = {}) {
  const modoNormalizado = normalizarModo(modo);

  // INICIA y FINALIZA ya no admiten fotografías.
  if (modoNormalizado === "INICIA" || modoNormalizado === "FINALIZA") return "";

  if (modoNormalizado === "INFORMES") {
    const tipoInforme = normalizarModo(payload?.tipo_informe);
    if ([
      "ALCOHOLEMIA_POSITIVA",
      "CONTROL_ARMAS",
      "REQUISA_VEHICULAR",
      "DECRETO_460_22",
      "RETENCION_LICENCIA"
    ].includes(tipoInforme)) return "";
  }

  // Se conserva la infraestructura para cualquier módulo futuro que sí use fotos.
  if (payload?.foto_prefijo) return String(payload.foto_prefijo || "").trim();
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
