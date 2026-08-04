export function normalizarOperativosProgramadosV2(data) {
  if (!Array.isArray(data)) return [];

  return data
    .map(normalizarOperativoProgramadoV2)
    .filter((operativo) => Boolean(operativo?.operativo_key));
}

export function normalizarOperativoProgramadoV2(row) {
  if (!row) return null;

  const tipoOriginal = texto(row.tipo || "OPERATIVO");
  const horaInicio = texto(row.hora_desde || extraerHoraInicio(row.inicio_operativo));
  const horaFin = normalizarHoraFinAbierta(row.hora_hasta);

  return {
    ...row,
    operativo_key: texto(row.operativo_key || row.id || construirKeyFallback(row)),
    guardia_fecha: texto(row.guardia_fecha),
    fecha_operativo: texto(row.fecha_operativo),
    inicio_operativo: texto(row.inicio_operativo),
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    lugar: texto(row.lugar || "SIN LUGAR"),
    lugar_normalizado: texto(row.lugar_normalizado || row.lugar),

    // tipo_operativo determina qué formulario abre Informes_GP.
    // tipo_nombre conserva exactamente el tipo publicado por Filtro Órdenes.
    tipo_operativo: resolverTipoFormulario(tipoOriginal),
    tipo_nombre: tipoOriginal || "OPERATIVO",
    tipo_original: tipoOriginal,

    estado: row.sin_efecto ? "SIN_EFECTO" : "PROGRAMADO",
    activo: Boolean(row.activo),
    sin_efecto: Boolean(row.sin_efecto),
    ordenes_origen: normalizarArray(row.ordenes_origen),
    archivos_origen: normalizarArray(row.archivos_origen),
    error_en_la_orden: Boolean(row.error_en_la_orden),
    error_motivo: texto(row.error_motivo),
    registro_original: normalizarObjeto(row.registro_original),
    datos: {
      fecha_operativo: texto(row.fecha_operativo),
      inicio_operativo: texto(row.inicio_operativo),
      lugar_normalizado: texto(row.lugar_normalizado || row.lugar),
      tipo_original: tipoOriginal,
      ordenes_origen: normalizarArray(row.ordenes_origen),
      archivos_origen: normalizarArray(row.archivos_origen),
      registro_original: normalizarObjeto(row.registro_original)
    }
  };
}

/**
 * Traduce el tipo textual publicado por Filtro Órdenes al catálogo de
 * formularios que ya existe en Informes_GP, sin alterar el texto mostrado.
 */
export function resolverTipoFormulario(tipo) {
  const key = normalizarKey(tipo);

  if (!key) return "GENERICO";

  if (key.includes("DICEP") && (key.includes("OCV") || key.includes("CONTROL_VEHICULAR"))) {
    return "OCV_DICEP";
  }

  if (
    key === "OCV" ||
    key.includes("OCV_Y_ALCOHOLEMIA") ||
    key.includes("OPERATIVO_DE_CONTROL_VEHICULAR") ||
    key.includes("CONTROL_VEHICULAR_Y_ALCOHOLEMIA")
  ) {
    return "OCV";
  }

  if (key.includes("PRESENCIA_ACTIVA")) {
    return "PRESENCIA_ACTIVA";
  }

  if (key.includes("PATRULLAJE")) {
    return "PATRULLAJE";
  }

  if (key.includes("CONTROL_DE_PESO") || key.includes("CONTROL_PESO")) {
    return "CONTROL_PESO";
  }

  // Los operativos sin formulario específico (por ejemplo Ordenamiento
  // Vehicular / Retorno) siguen usando el formulario genérico actual.
  return "GENERICO";
}

function construirKeyFallback(row) {
  return [
    row?.guardia_fecha,
    row?.fecha_operativo,
    row?.hora_desde,
    row?.hora_hasta,
    row?.lugar_normalizado || row?.lugar,
    row?.tipo
  ]
    .map((parte) => texto(parte).toLowerCase())
    .filter(Boolean)
    .join("|");
}

function extraerHoraInicio(valor) {
  const match = texto(valor).match(/(?:T|\s)(\d{1,2}:\d{2})/);
  return match ? match[1] : "";
}

function normalizarHoraFinAbierta(valor) {
  const limpio = texto(valor);
  return /FINALIZAR/i.test(limpio) ? "FINALIZAR" : limpio;
}

function normalizarKey(valor) {
  return texto(valor)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizarArray(valor) {
  if (Array.isArray(valor)) {
    return valor.map(texto).filter(Boolean);
  }

  if (typeof valor === "string" && valor.trim()) {
    try {
      const parsed = JSON.parse(valor);
      if (Array.isArray(parsed)) return parsed.map(texto).filter(Boolean);
    } catch {}

    return valor
      .split(/[\n,;/]+/)
      .map(texto)
      .filter(Boolean);
  }

  return [];
}

function normalizarObjeto(valor) {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) {
    return valor;
  }

  if (typeof valor === "string" && valor.trim()) {
    try {
      const parsed = JSON.parse(valor);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
  }

  return {};
}

function texto(valor) {
  return String(valor ?? "").trim();
}
