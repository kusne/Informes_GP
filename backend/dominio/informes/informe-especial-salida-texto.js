export function construirTextoInformeEspecial(informe) {
  if (!informe) return "";

  if (informe.modelo === "CONTROL_SUPERIOR") {
    return construirControlSuperior(informe);
  }

  if (informe.modelo === "ALCOHOLEMIA_POSITIVA") {
    return construirAlcoholemia(informe);
  }

  if (informe.modelo === "DECRETO_460_22") {
    return construirDecreto46022(informe);
  }

  return "";
}

function construirControlSuperior(informe) {
  const f = informe.formulario || {};
  const lineas = [];

  lineas.push("INFORME CONTROL SUPERIOR");
  agregarLinea(lineas, "AUTORIDAD", f.autoridad);
  agregarLinea(lineas, "NOMBRE / CARGO", f.nombre_autoridad);
  agregarLinea(lineas, "OPERATIVO", resumenOperativo(informe));
  agregarLinea(lineas, "OBSERVACIONES", f.observaciones || "Se hace presente en el operativo y realiza control superior.");

  return lineas.join("\n");
}

function construirAlcoholemia(informe) {
  const f = informe.formulario || {};
  const c = informe.calculos || {};
  const lineas = [];

  lineas.push("INFORME ALCOHOLEMIA POSITIVA");
  agregarLinea(lineas, "OPERATIVO", resumenOperativo(informe));
  agregarLinea(lineas, "CONDUCTOR", f.conductor);
  agregarLinea(lineas, "DNI", f.dni);
  agregarLinea(lineas, "DOMINIO", f.dominio);
  agregarLinea(lineas, "TIPO VEHÍCULO", f.tipo_vehiculo);
  agregarLinea(lineas, "RESULTADO", `${formatearNumero(c.resultado)} G/L`);

  if (c.sancionable) {
    lineas.push(`RESULTADO: POSITIVO SANCIONABLE - CÓDIGO ${c.codigo_sancionable}`);
  } else {
    lineas.push("RESULTADO: POSITIVO NO SANCIONABLE");
  }

  const licencia = construirTextoLicencia(f);
  if (licencia) lineas.push(licencia);

  if (Boolean(f.con_decreto_460_22)) {
    if (c.sancionable) {
      lineas.push("OBSERVACIÓN: ALCOHOLEMIA POSITIVA SANCIONABLE CON REMISIÓN POR Dcto 460/22.");
    } else {
      lineas.push("OBSERVACIÓN: REMISIÓN POR Dcto 460/22 y ALCOHOLEMIA POSITIVA NO SANCIONABLE.");
    }
  }

  agregarNumeralesSugeridos(lineas, informe);
  agregarLinea(lineas, "OBSERVACIONES", f.observaciones);

  return lineas.filter(Boolean).join("\n");
}

function construirDecreto46022(informe) {
  const f = informe.formulario || {};
  const lineas = [];

  lineas.push("INFORME DECRETO 460/22");
  agregarLinea(lineas, "OPERATIVO", resumenOperativo(informe));
  agregarLinea(lineas, "CONDUCTOR / INVOLUCRADO", f.conductor);
  agregarLinea(lineas, "DNI", f.dni);
  agregarLinea(lineas, "DOMINIO", f.dominio);
  agregarLinea(lineas, "TIPO VEHÍCULO", f.tipo_vehiculo);
  agregarLinea(lineas, "MOTIVO", f.motivo);
  lineas.push("OBSERVACIÓN: Se realizó (01) Procedimiento por Dcto 460/22.");
  agregarNumeralesSugeridos(lineas, informe);
  agregarLinea(lineas, "AMPLIACIÓN", f.observaciones);

  return lineas.filter(Boolean).join("\n");
}

function agregarNumeralesSugeridos(lineas, informe) {
  const items = Array.isArray(informe.numerales_sugeridos) ? informe.numerales_sugeridos : [];

  if (!items.length) return;

  lineas.push("NUMERALES SUGERIDOS:");
  for (const item of items) {
    lineas.push(`${item.codigo} x${item.cantidad || 1} - ${item.detalle}`);
  }
}

function construirTextoLicencia(f) {
  const clase = String(f.clase || "").trim();

  if (Boolean(f.licencia_digital) && clase) {
    return `LICENCIA: POSEE LICENCIA DIGITAL CLASE ${clase}`;
  }

  if (!Boolean(f.licencia_digital) && clase && contieneDni(clase)) {
    return `LICENCIA: NO POSEE LICENCIA DE CONDUCIR, POSEE DNI ${clase}`;
  }

  if (clase) {
    return `LICENCIA: CLASE ${clase}`;
  }

  return "";
}

function contieneDni(valor) {
  const texto = String(valor || "");
  return /\d{7,8}/.test(texto);
}

function resumenOperativo(informe) {
  const horario = `${informe.hora_inicio || "--:--"} A ${informe.hora_fin || "--:--"} HS`;
  const lugar = informe.lugar || "SIN LUGAR";
  const tipo = String(informe.tipo_operativo || "OPERATIVO").replaceAll("_", " ");

  return `${horario} - ${lugar} - ${tipo}`;
}

function agregarLinea(lineas, etiqueta, valor) {
  const texto = String(valor || "").trim();

  if (texto) {
    lineas.push(`${etiqueta}: ${texto}`);
  }
}

function formatearNumero(valor) {
  const n = Number(valor || 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2).replace(".", ",");
}