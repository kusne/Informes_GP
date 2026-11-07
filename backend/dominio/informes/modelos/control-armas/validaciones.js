// Validación encapsulada: CONTROL_ARMAS
import { extraerCodigosFalta, getNomencladorFalta } from "../../../finaliza/numerales/nomenclador.js";
import { interpretarLicenciaDniAlcoholemia } from "../../licencia-dni-alcoholemia.js";
import { resolverLugarProcedimiento46022 } from "../../../compartido/lugares/lugar-procedimiento-460-22.js";

function validarControlArmas(informe, errores) {
  const f = informe.formulario || {};
  if (!texto(f.fecha_hecho)) errores.push("Debe completar fecha del hecho.");
  if (!texto(f.hora_hecho)) errores.push("Debe completar hora del hecho.");
  if (!texto(f.tipo_vehiculo)) errores.push("Debe seleccionar tipo de vehículo.");
  if (!texto(f.conductor)) errores.push("Debe completar conductor.");
  const cantidad = Number(f.cantidad_armas || 0);
  if (!Number.isFinite(cantidad) || cantidad <= 0) errores.push("Debe indicar una cantidad de armas mayor a 0.");
  if (!texto(f.tipo_arma)) errores.push("Debe seleccionar tipo de arma.");
  if (!texto(f.documentacion_armas)) errores.push("Debe indicar el estado de la documentación del armamento.");
}

function texto(valor) {
  return String(valor || "").trim();
}

export { validarControlArmas as validarModelo };
