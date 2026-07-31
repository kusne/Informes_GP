import { TIPO_GENERICO_CONFIG } from "./tipo-generico.config.js";

export function obtenerConfigTipo() {
  return { ...TIPO_GENERICO_CONFIG };
}

export function obtenerRutasTipo() {
  return { ...TIPO_GENERICO_CONFIG.rutas };
}

export function obtenerReglasTipo() {
  return { ...TIPO_GENERICO_CONFIG.reglas };
}

export default TIPO_GENERICO_CONFIG;
