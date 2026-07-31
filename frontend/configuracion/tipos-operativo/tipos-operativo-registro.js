import { TIPO_OCV_CONFIG } from "./ocv/tipo-ocv.config.js";
import { TIPO_OCV_DICEP_CONFIG } from "./ocv-dicep/tipo-ocv-dicep.config.js";
import { TIPO_PRESENCIA_ACTIVA_CONFIG } from "./presencia-activa/tipo-presencia-activa.config.js";
import { TIPO_PATRULLAJE_CONFIG } from "./patrullaje/tipo-patrullaje.config.js";
import { TIPO_CONTROL_PESO_CONFIG } from "./control-peso/tipo-control-peso.config.js";
import { TIPO_GENERICO_CONFIG } from "./generico/tipo-generico.config.js";

const TIPOS_REGISTRADOS = [
  TIPO_OCV_CONFIG,
  TIPO_OCV_DICEP_CONFIG,
  TIPO_PRESENCIA_ACTIVA_CONFIG,
  TIPO_PATRULLAJE_CONFIG,
  TIPO_CONTROL_PESO_CONFIG,
  TIPO_GENERICO_CONFIG
];

const MAPA_TIPOS = new Map();

for (const tipo of TIPOS_REGISTRADOS) {
  MAPA_TIPOS.set(normalizarKeyTipo(tipo.key), tipo);
  MAPA_TIPOS.set(normalizarKeyTipo(tipo.slug), tipo);
  MAPA_TIPOS.set(normalizarKeyTipo(tipo.nombre), tipo);
}

export function listarTiposOperativoRegistrados() {
  return TIPOS_REGISTRADOS.map((tipo) => ({ ...tipo }));
}

export function obtenerTipoOperativoRegistrado(tipoOperativo) {
  const key = normalizarKeyTipo(tipoOperativo);
  return MAPA_TIPOS.get(key) || TIPO_GENERICO_CONFIG;
}

export function existeTipoOperativoRegistrado(tipoOperativo) {
  const key = normalizarKeyTipo(tipoOperativo);
  return MAPA_TIPOS.has(key);
}

export function normalizarKeyTipo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}
