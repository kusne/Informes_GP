// Fachada pública estable. Las reglas específicas pertenecen al propio modelo.
import { validarModelo as validar_PROCEDIMIENTO } from "./modelos/procedimiento/validaciones.js";
import { validarModelo as validar_CONTROL_SUPERIOR } from "./modelos/control-superior/validaciones.js";
import { validarModelo as validar_ALCOHOLEMIA_POSITIVA } from "./modelos/alcoholemia-positiva/validaciones.js";
import { validarModelo as validar_DECRETO_460_22 } from "./modelos/decreto-460-22/validaciones.js";
import { validarModelo as validar_CONTROL_ARMAS } from "./modelos/control-armas/validaciones.js";
import { validarModelo as validar_RETENCION_LICENCIA } from "./modelos/retencion-licencia/validaciones.js";
import { validarModelo as validar_REQUISA_VEHICULAR } from "./modelos/requisa-vehicular/validaciones.js";

const VALIDACIONES = Object.freeze({
  PROCEDIMIENTO: validar_PROCEDIMIENTO,
  CONTROL_SUPERIOR: validar_CONTROL_SUPERIOR,
  ALCOHOLEMIA_POSITIVA: validar_ALCOHOLEMIA_POSITIVA,
  DECRETO_460_22: validar_DECRETO_460_22,
  CONTROL_ARMAS: validar_CONTROL_ARMAS,
  RETENCION_LICENCIA: validar_RETENCION_LICENCIA,
  REQUISA_VEHICULAR: validar_REQUISA_VEHICULAR
});

export function validarInformeEspecial(informe) {
  const errores = [];
  if (!informe?.modelo) errores.push("Debe seleccionar un tipo de informe especial.");
  if (!informe?.operativo_key) errores.push("Debe seleccionar uno de los últimos operativos iniciados.");
  if (!informe?.guardia_fecha) errores.push("No se pudo resolver la guardia_fecha.");
  if (!informe?.lugar && informe?.modelo !== "DECRETO_460_22") errores.push("El operativo seleccionado no tiene lugar.");
  const validar = Object.prototype.hasOwnProperty.call(VALIDACIONES, informe?.modelo) ? VALIDACIONES[informe.modelo] : null;
  if (validar) validar(informe, errores);
  return errores;
}
