import { TIPO_PATRULLAJE_CONFIG } from "./tipo-patrullaje.config.js";

export function obtenerConfigTipo() {
  return { ...TIPO_PATRULLAJE_CONFIG };
}

export function obtenerRutasTipo() {
  return { ...TIPO_PATRULLAJE_CONFIG.rutas };
}

export function obtenerReglasTipo() {
  return { ...TIPO_PATRULLAJE_CONFIG.reglas };
}

export default TIPO_PATRULLAJE_CONFIG;
