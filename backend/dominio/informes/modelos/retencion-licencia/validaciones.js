// Validación encapsulada: RETENCION_LICENCIA
import { extraerCodigosFalta, getNomencladorFalta } from "../../../finaliza/numerales/nomenclador.js";
import { interpretarLicenciaDniAlcoholemia } from "../../licencia-dni-alcoholemia.js";
import { resolverLugarProcedimiento46022 } from "../../../compartido/lugares/lugar-procedimiento-460-22.js";

function validarRetencionLicencia(informe, errores) {
  const f = informe.formulario || {};
  const motivo = texto(f.motivo_licencia);
  if (!motivo) errores.push("Debe seleccionar el motivo de retención de licencia.");
  if (!texto(f.fecha_hecho)) errores.push("Debe completar fecha del procedimiento.");
  if (!texto(f.hora_hecho)) errores.push("Debe completar hora del procedimiento.");
  if (!texto(f.conductor)) errores.push("Debe completar conductor.");
  if (!texto(f.tipo_vehiculo)) errores.push("Debe seleccionar tipo de vehículo.");
  if (!texto(f.dominio)) errores.push("Debe completar dominio.");
  if (!texto(f.marca)) errores.push("Debe completar marca.");
  if (!texto(f.modelo_vehiculo)) errores.push("Debe completar modelo del vehículo.");
  if (!texto(f.clase_licencia)) errores.push("Debe completar clase de licencia.");
  if (!texto(f.numero_acta)) errores.push("Debe completar N° de Acta / Cédula de notificación.");
  if (texto(f.codigo) && !getNomencladorFalta(f.codigo)) errores.push("El código de licencia no existe en nomenclador.js.");
  validarJuzgadoRetencion(f, errores, Boolean(f.retencion_licencia));

  if (["VENCIDA_MAS_6_MESES", "VENCIDA_MENOS_6_MESES", "CADUCA_CAMBIO_DATOS"].includes(motivo) && !texto(f.fecha_vencimiento)) {
    errores.push("Debe completar fecha de vencimiento / VTO de la licencia.");
  }

}

function validarJuzgadoRetencion(f, errores, habilitado) {
  if (!habilitado) return;
  const elegido = texto(f.juzgado || "SANTA FE").toLocaleUpperCase("es-AR");
  const opciones = ["SANTA FE", "RINCON", "RECREO", "SAUCE VIEJO", "SANTO TOME", "OTRO"];
  if (!opciones.includes(elegido)) {
    errores.push("Seleccione un juzgado válido.");
  } else if (elegido === "OTRO" && !texto(f.juzgado_otro)) {
    errores.push("Complete el nombre del juzgado al seleccionar OTRO.");
  }
}

function texto(valor) {
  return String(valor || "").trim();
}

export { validarRetencionLicencia as validarModelo };
