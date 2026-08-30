import { extraerCodigosFalta, getNomencladorFalta } from "../finaliza/numerales/nomenclador.js";

export function validarInformeEspecial(informe) {
  const errores = [];

  if (!informe?.modelo) {
    errores.push("Debe seleccionar un tipo de informe especial.");
  }

  if (!informe?.operativo_key) {
    errores.push("Debe seleccionar uno de los últimos operativos iniciados.");
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

  if (informe?.modelo === "REQUISA_VEHICULAR") {
    validarRequisaVehicular(informe, errores);
  }

  return errores;
}

function validarControlSuperior(informe, errores) {
  const f = informe.formulario || {};
  const hayAutoridad = Boolean(f.autoridad_jefe || f.autoridad_subjefe || f.autoridad_otros);

  if (!hayAutoridad) errores.push("Debe tildar al menos una autoridad de Control Superior.");
  if (Boolean(f.autoridad_otros) && !texto(f.nombre_autoridad)) {
    errores.push("Si selecciona Otros, debe completar nombre/cargo de la autoridad.");
  }
  if (Boolean(f.movil_otro) && !texto(f.moviles_otros)) {
    errores.push("Si selecciona Otro móvil, debe completar el/los número/s.");
  }
}

function validarAlcoholemia(informe, errores) {
  const f = informe.formulario || {};
  const c = informe.calculos || {};

  if (!texto(f.tipo_vehiculo)) errores.push("Debe seleccionar tipo de vehículo.");
  if (!texto(f.marca)) errores.push("Debe completar marca.");
  if (!texto(f.modelo_vehiculo)) errores.push("Debe completar modelo.");
  if (!texto(f.conductor)) errores.push("Debe completar conductor.");
  if (!texto(f.clase)) errores.push("Debe completar Licencia Clase / DNI.");

  const resultado = parsearDecimal(f.resultado);
  if (!Number.isFinite(resultado) || resultado <= 0) {
    errores.push("Debe completar graduación de alcoholemia mayor a 0.");
  }

  // Para una alcoholemia sancionable el formato institucional necesita acta.
  if (Boolean(c.sancionable) && !texto(f.numero_acta)) {
    errores.push("Debe completar N° de acta para una alcoholemia sancionable.");
  }

  const otrosCodigosTexto = texto(f.otros_codigos);
  if (otrosCodigosTexto) {
    const codigos = extraerCodigosFalta(otrosCodigosTexto);
    if (!codigos.length) {
      errores.push("Otros códigos debe contener códigos numéricos válidos.");
    } else {
      const invalidos = codigos.filter((codigo) => !getNomencladorFalta(codigo));
      if (invalidos.length) {
        errores.push(`Código/s no encontrado/s en nomenclador: ${invalidos.join(", ")}.`);
      }
    }
  }
}

function validarDecreto46022(informe, errores) {
  const f = informe.formulario || {};

  // Conductor y DNI son datos opcionales: el formato institucional 460/22 no
  // los imprime como campos independientes. Sí son obligatorios los datos que
  // integran el relato del procedimiento.
  if (!texto(f.marca)) errores.push("Debe completar la marca de la motocicleta.");
  if (!texto(f.modelo_vehiculo)) errores.push("Debe completar el modelo de la motocicleta.");
  if (!texto(f.dominio)) errores.push("Debe completar dominio.");
  if (!texto(f.numero_acta)) errores.push("Debe completar el N.º de acta de infracción.");

  const codigos = extraerCodigosFalta(f.codigos_infraccion);
  if (!codigos.length) {
    errores.push("Debe ingresar al menos un código de infracción del nomenclador.");
    return;
  }

  const invalidos = codigos.filter((codigo) => !getNomencladorFalta(codigo));
  if (invalidos.length) {
    errores.push(`Código/s no encontrado/s en nomenclador: ${invalidos.join(", ")}.`);
  }
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
  if (texto(f.codigo) && !getNomencladorFalta(f.codigo)) errores.push("El código de licencia no existe en nomenclador.js.");

  if (["VENCIDA_MAS_6_MESES", "VENCIDA_MENOS_6_MESES", "CADUCA_CAMBIO_DATOS"].includes(motivo) && !texto(f.fecha_vencimiento)) {
    errores.push("Debe completar fecha de vencimiento / VTO de la licencia.");
  }

}

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

function parsearDecimal(valor) {
  const limpio = String(valor ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");

  if (!limpio) return NaN;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : NaN;
}

function texto(valor) {
  return String(valor || "").trim();
}
