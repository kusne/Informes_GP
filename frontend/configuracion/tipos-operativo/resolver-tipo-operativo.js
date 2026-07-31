import {
  obtenerTipoOperativoRegistrado,
  listarTiposOperativoRegistrados,
  existeTipoOperativoRegistrado,
  normalizarKeyTipo
} from "./tipos-operativo-registro.js";

export function resolverTipoOperativo(tipoOperativo) {
  return obtenerTipoOperativoRegistrado(tipoOperativo);
}

export function resolverFormularioPorModoYOperativo(modo, operativo) {
  const modoNormalizado = normalizarModo(modo);
  const tipo = resolverTipoOperativo(operativo?.tipo_operativo || operativo?.tipo || operativo?.tipo_nombre);

  if (!tipo?.rutas) {
    return null;
  }

  if (modoNormalizado === "INICIA") {
    return tipo.rutas?.inicia?.html || null;
  }

  if (modoNormalizado === "FINALIZA") {
    return tipo.rutas?.finaliza?.html || null;
  }

  return null;
}

export function resolverRutasTipoOperativo(tipoOperativo) {
  const tipo = resolverTipoOperativo(tipoOperativo);
  return tipo.rutas || {};
}

export function resolverNombreTipoOperativo(tipoOperativo) {
  const tipo = resolverTipoOperativo(tipoOperativo);
  return tipo.nombre || tipoOperativo || "OPERATIVO";
}

export function resolverSlugTipoOperativo(tipoOperativo) {
  const tipo = resolverTipoOperativo(tipoOperativo);
  return tipo.slug || "generico";
}

function normalizarModo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

export {
  listarTiposOperativoRegistrados,
  existeTipoOperativoRegistrado,
  normalizarKeyTipo
};