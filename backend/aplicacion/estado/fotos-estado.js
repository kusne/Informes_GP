import {
  obtenerEstadoInformes,
  establecerEstadoInformes
} from "./informes-state.js";

export function resolverPrefijoFotoPorModoPayload({
  modo,
  payload
} = {}) {
  const modoNormalizado = normalizarModo(modo);

  if (payload?.foto_prefijo) {
    return String(payload.foto_prefijo || "").trim();
  }

  if (modoNormalizado === "INICIA") {
    return `inicio-${slugTipo(payload?.tipo_operativo)}`;
  }

  if (modoNormalizado === "FINALIZA") {
    return `finaliza-${slugTipo(payload?.tipo_operativo)}`;
  }

  if (modoNormalizado === "INFORMES") {
    const tipoInforme = normalizarModo(payload?.tipo_informe);

    if (tipoInforme === "ALCOHOLEMIA_POSITIVA") return "alcoholemia-positiva";
    if (tipoInforme === "DECRETO_460_22") return "decreto-460-22";
  }

  return "";
}

export function obtenerFotosPorPrefijo(prefijo) {
  const key = String(prefijo || "").trim();

  if (!key) return [];

  const fotosWindow = window.InformesGP?.fotos?.[key];

  if (Array.isArray(fotosWindow)) {
    return fotosWindow;
  }

  const estado = obtenerEstadoInformes();
  const fotosEstado = estado?.fotos?.[key];

  return Array.isArray(fotosEstado) ? fotosEstado : [];
}

export function limpiarFotosPorPrefijo(prefijo) {
  const key = String(prefijo || "").trim();

  if (!key) return;

  const fotos = obtenerFotosPorPrefijo(key);

  for (const foto of fotos) {
    if (foto?.urlTemporal) {
      try {
        URL.revokeObjectURL(foto.urlTemporal);
      } catch {}
    }
  }

  window.InformesGP = window.InformesGP || {};
  window.InformesGP.fotos = window.InformesGP.fotos || {};
  window.InformesGP.fotos[key] = [];

  const estado = obtenerEstadoInformes();
  const fotosEstado = {
    ...(estado.fotos || {}),
    [key]: []
  };

  establecerEstadoInformes({
    fotos: fotosEstado
  });
}

export function limpiarFotosPorModoPayload({
  modo,
  payload
} = {}) {
  const prefijo = resolverPrefijoFotoPorModoPayload({
    modo,
    payload
  });

  limpiarFotosPorPrefijo(prefijo);

  return prefijo;
}

export function limpiarTodasLasFotosMemoria() {
  const estado = obtenerEstadoInformes();
  const fotosEstado = estado?.fotos || {};
  const fotosWindow = window.InformesGP?.fotos || {};
  const keys = new Set([
    ...Object.keys(fotosEstado),
    ...Object.keys(fotosWindow)
  ]);

  for (const key of keys) {
    limpiarFotosPorPrefijo(key);
  }
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
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}