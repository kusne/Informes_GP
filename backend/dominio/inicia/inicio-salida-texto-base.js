export function construirTextoInicioBase(inicio) {
  if (!inicio) return "";

  const f = inicio.formulario || {};
  const lineas = [];

  lineas.push("INICIA OPERATIVO");
  agregarLinea(lineas, "TIPO", formatearTipo(inicio.tipo_operativo));
  agregarLinea(lineas, "HORARIO", formatearHorario(inicio));
  agregarLinea(lineas, "LUGAR", inicio.lugar);
  agregarLinea(lineas, "PERSONAL", f.personal);
  agregarLinea(lineas, "MÓVILES / MOTOS", f.moviles_motos);
  agregarLinea(lineas, "ELEMENTOS", f.elementos);
  agregarLinea(lineas, "OBSERVACIONES", f.observaciones);

  return lineas.filter(Boolean).join("\n");
}

function agregarLinea(lineas, etiqueta, valor) {
  const texto = String(valor || "").trim();

  if (texto) {
    lineas.push(`${etiqueta}: ${texto}`);
  }
}

function formatearHorario(inicio) {
  const hi = String(inicio?.hora_inicio || "").trim();
  const hf = String(inicio?.hora_fin || "").trim();

  if (!hi && !hf) return "";
  return `${hi || "--:--"} A ${hf || "--:--"} HS`;
}

function formatearTipo(valor) {
  return String(valor || "OPERATIVO")
    .replaceAll("_", " ")
    .trim();
}