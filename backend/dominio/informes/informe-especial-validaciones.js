export function validarInformeEspecial(informe) {
  const errores = [];

  if (!informe?.modelo) {
    errores.push("Debe seleccionar un tipo de informe especial.");
  }

  if (!informe?.operativo_key) {
    errores.push("Debe seleccionar un operativo iniciado.");
  }

  if (!informe?.guardia_fecha) {
    errores.push("No se pudo resolver la guardia_fecha.");
  }

  if (!informe?.lugar) {
    errores.push("El operativo seleccionado no tiene lugar.");
  }

  if (informe?.modelo === "CONTROL_SUPERIOR") {
    validarControlSuperior(informe, errores);
  }

  if (informe?.modelo === "ALCOHOLEMIA_POSITIVA") {
    validarAlcoholemia(informe, errores);
  }

  if (informe?.modelo === "DECRETO_460_22") {
    validarDecreto46022(informe, errores);
  }

  if (informe?.modelo === "CONTROL_ARMAS") {
    validarControlArmas(informe, errores);
  }

  if (informe?.modelo === "RETENCION_LICENCIA") {
    validarRetencionLicencia(informe, errores);
  }

  return errores;
}

function validarControlSuperior(informe, errores) {
  const f = informe.formulario || {};

  if (!texto(f.autoridad)) {
    errores.push("Debe seleccionar la autoridad de Control Superior.");
  }

  if (!texto(f.nombre_autoridad)) {
    errores.push("Debe completar nombre/cargo de la autoridad.");
  }
}

function validarAlcoholemia(informe, errores) {
  const f = informe.formulario || {};

  if (!texto(f.conductor)) errores.push("Debe completar conductor.");
  if (!texto(f.dni)) errores.push("Debe completar DNI.");
  if (!texto(f.dominio)) errores.push("Debe completar dominio.");
  if (!texto(f.tipo_vehiculo)) errores.push("Debe seleccionar tipo de vehículo.");

  const resultado = Number(f.resultado);

  if (!Number.isFinite(resultado) || resultado <= 0) {
    errores.push("Debe completar resultado de alcoholemia mayor a 0.");
  }

  if (Boolean(f.licencia_digital) && !texto(f.clase)) {
    errores.push("Si posee licencia digital, debe completar Clase.");
  }
}

function validarDecreto46022(informe, errores) {
  const f = informe.formulario || {};

  if (!texto(f.conductor)) errores.push("Debe completar conductor/involucrado.");
  if (!texto(f.dni)) errores.push("Debe completar DNI.");
  if (!texto(f.dominio)) errores.push("Debe completar dominio.");
  if (!texto(f.motivo)) errores.push("Debe completar motivo/infracción.");
}


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

  if (["VENCIDA_MAS_6_MESES", "VENCIDA_MENOS_6_MESES", "CADUCA_CAMBIO_DATOS"].includes(motivo) && !texto(f.fecha_vencimiento)) {
    errores.push("Debe completar fecha de vencimiento / VTO de la licencia.");
  }

  if (motivo === "MAL_OTORGADA" && !texto(f.detalle_motivo)) {
    errores.push("Para licencia mal otorgada debe completar el detalle / aclaración.");
  }
}

function texto(valor) {
  return String(valor || "").trim();
}