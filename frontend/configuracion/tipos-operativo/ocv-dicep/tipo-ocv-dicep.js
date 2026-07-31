import { TIPO_OCV_DICEP_CONFIG } from "./tipo-ocv-dicep.config.js";

export function obtenerConfigTipo() {
  return { ...TIPO_OCV_DICEP_CONFIG };
}

export function obtenerRutasTipo() {
  return { ...TIPO_OCV_DICEP_CONFIG.rutas };
}

export function obtenerReglasTipo() {
  return { ...TIPO_OCV_DICEP_CONFIG.reglas };
}

export default TIPO_OCV_DICEP_CONFIG;
