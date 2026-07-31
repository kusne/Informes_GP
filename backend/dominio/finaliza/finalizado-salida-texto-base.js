export function construirTextoFinalizadoBase(finalizado) {
  if (!finalizado) return "";

  const f = finalizado.formulario || {};
  const numerales = finalizado.numeralesFinaliza || {};

  const lineas = [];

  lineas.push("FINALIZA OPERATIVO");
  agregarLinea(lineas, "TIPO", finalizado.tipo_operativo);
  agregarLinea(lineas, "HORARIO", construirHorario(finalizado));
  agregarLinea(lineas, "LUGAR", finalizado.lugar);
  agregarLinea(lineas, "ACTAS", f.actas);
  agregarLinea(lineas, "PERSONAS IDENTIFICADAS", f.personas);
  agregarLinea(lineas, "VEHÍCULOS CONTROLADOS", f.vehiculos);

  const textoNumerales = String(numerales.texto || f.numerales || "").trim();

  if (textoNumerales) {
    lineas.push("DETALLES / NUMERALES:");
    lineas.push(textoNumerales);
  }

  agregarLinea(lineas, "OBSERVACIONES", f.observaciones);

  return lineas.filter(Boolean).join("\n");
}

function construirHorario(finalizado) {
  const inicio = finalizado.hora_inicio || "--:--";
  const fin = finalizado.hora_fin || "--:--";

  return `${inicio} A ${fin} HS`;
}

function agregarLinea(lineas, etiqueta, valor) {
  const texto = String(valor ?? "").trim();

  if (texto) {
    lineas.push(`${etiqueta}: ${texto}`);
  }
}