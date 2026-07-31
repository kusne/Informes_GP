import { TIPO_CONTROL_PESO_CONFIG } from "./tipo-control-peso.config.js";

export function obtenerConfigTipo() {
  return { ...TIPO_CONTROL_PESO_CONFIG };
}

export function obtenerRutasTipo() {
  return { ...TIPO_CONTROL_PESO_CONFIG.rutas };
}

export function obtenerReglasTipo() {
  return { ...TIPO_CONTROL_PESO_CONFIG.reglas };
}

export default TIPO_CONTROL_PESO_CONFIG;
