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

function texto(valor) {
  return String(valor || "").trim();
}