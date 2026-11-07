// Validación encapsulada: REQUISA_VEHICULAR
import { extraerCodigosFalta, getNomencladorFalta } from "../../../finaliza/numerales/nomenclador.js";
import { interpretarLicenciaDniAlcoholemia } from "../../licencia-dni-alcoholemia.js";
import { resolverLugarProcedimiento46022 } from "../../../compartido/lugares/lugar-procedimiento-460-22.js";

function validarRequisaVehicular(informe, errores) {
  const f = informe.formulario || {};

  if (!texto(f.fecha_hecho)) errores.push("No se pudo resolver la fecha de la requisa.");
  if (!texto(f.hora_hecho)) errores.push("No se pudo resolver el horario de la requisa.");
  if (!texto(f.tipo_vehiculo)) errores.push("Debe seleccionar tipo de vehículo.");
  if (!texto(f.dominio)) errores.push("Debe completar dominio.");
  if (!["MASCULINO", "FEMENINO"].includes(texto(f.genero).toUpperCase())) {
    errores.push("Debe seleccionar género masculino o femenino.");
  }
}

function texto(valor) {
  return String(valor || "").trim();
}

export { validarRequisaVehicular as validarModelo };
