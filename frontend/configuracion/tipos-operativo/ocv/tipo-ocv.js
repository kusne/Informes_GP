import { TIPO_OCV_CONFIG } from "./tipo-ocv.config.js";

export function obtenerConfigTipo() {
  return { ...TIPO_OCV_CONFIG };
}

export function obtenerRutasTipo() {
  return { ...TIPO_OCV_CONFIG.rutas };
}

export function obtenerReglasTipo() {
  return { ...TIPO_OCV_CONFIG.reglas };
}

export default TIPO_OCV_CONFIG;
