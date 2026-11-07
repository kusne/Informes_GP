// Fachada pública estable. Un informe no comparte código de presentación con otro.
import { construirInforme as salida_PROCEDIMIENTO } from "./modelos/procedimiento/salida-texto.js";
import { construirInforme as salida_CONTROL_SUPERIOR } from "./modelos/control-superior/salida-texto.js";
import { construirInforme as salida_ALCOHOLEMIA_POSITIVA } from "./modelos/alcoholemia-positiva/salida-texto.js";
import { construirInforme as salida_DECRETO_460_22 } from "./modelos/decreto-460-22/salida-texto.js";
import { construirInforme as salida_CONTROL_ARMAS } from "./modelos/control-armas/salida-texto.js";
import { construirInforme as salida_RETENCION_LICENCIA } from "./modelos/retencion-licencia/salida-texto.js";
import { construirInforme as salida_REQUISA_VEHICULAR } from "./modelos/requisa-vehicular/salida-texto.js";

const FORMATOS = Object.freeze({
  PROCEDIMIENTO: salida_PROCEDIMIENTO,
  CONTROL_SUPERIOR: salida_CONTROL_SUPERIOR,
  ALCOHOLEMIA_POSITIVA: salida_ALCOHOLEMIA_POSITIVA,
  DECRETO_460_22: salida_DECRETO_460_22,
  CONTROL_ARMAS: salida_CONTROL_ARMAS,
  RETENCION_LICENCIA: salida_RETENCION_LICENCIA,
  REQUISA_VEHICULAR: salida_REQUISA_VEHICULAR
});

export function construirTextoInformeEspecial(informe) {
  if (!informe) return "";
  const crear = Object.prototype.hasOwnProperty.call(FORMATOS, informe.modelo) ? FORMATOS[informe.modelo] : null;
  return crear ? crear(informe) : "";
}
