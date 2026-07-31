import { TIPO_PRESENCIA_ACTIVA_CONFIG } from "./tipo-presencia-activa.config.js";

export function obtenerConfigTipo() {
  return { ...TIPO_PRESENCIA_ACTIVA_CONFIG };
}

export function obtenerRutasTipo() {
  return { ...TIPO_PRESENCIA_ACTIVA_CONFIG.rutas };
}

export function obtenerReglasTipo() {
  return { ...TIPO_PRESENCIA_ACTIVA_CONFIG.reglas };
}

export default TIPO_PRESENCIA_ACTIVA_CONFIG;
