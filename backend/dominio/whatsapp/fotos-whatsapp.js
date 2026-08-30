export function agregarFotosAlTextoWhatsapp({
  texto
} = {}) {
  // Las fotos NO se convierten en links dentro del texto de WhatsApp.
  // Los archivos reales se comparten desde la capa frontend mediante Web Share.
  return String(texto || "").trim();
}

export function contarFotosCargadasDesdeEstado({
  modo,
  estado,
  payload
} = {}) {
  const prefijo = resolverPrefijoFoto({
    modo,
    payload,
    estado
  });

  if (!prefijo) return 0;

  const fotosEstado = estado?.fotos?.[prefijo];
  if (Array.isArray(fotosEstado)) {
    return fotosEstado.length;
  }

  return 0;
}

export function resolverPrefijoFoto({
  modo,
  payload,
  estado
} = {}) {
  const modoNormalizado = normalizarModo(modo || estado?.modo || "");

  // INICIA y FINALIZA no comparten fotografías.
  if (modoNormalizado === "INICIA" || modoNormalizado === "FINALIZA") return "";

  if (modoNormalizado === "INFORMES") {
    const tipoInforme =
      payload?.tipo_informe ||
      estado?.informeActual?.modelo ||
      "";
    const tipo = normalizarModo(tipoInforme);

    if ([
      "ALCOHOLEMIA_POSITIVA",
      "CONTROL_ARMAS",
      "REQUISA_VEHICULAR",
      "DECRETO_460_22",
      "RETENCION_LICENCIA"
    ].includes(tipo)) return "";
  }

  if (payload?.foto_prefijo) {
    return String(payload.foto_prefijo || "").trim();
  }

  return "";
}

function normalizarFotos(fotos = []) {
  if (!Array.isArray(fotos)) return [];

  return fotos
    .map((foto) => ({
      indice: foto.indice || "",
      url_publica: foto.url_publica || foto.url || "",
      nombre: foto.nombre || ""
    }))
    .filter((foto) => foto.url_publica);
}

function slugTipo(valor) {
  const tipo = normalizarModo(valor || "GENERICO");

  const mapa = {
    OCV: "ocv",
    OCV_DICEP: "ocv-dicep",
    PRESENCIA_ACTIVA: "presencia-activa",
    PATRULLAJE: "patrullaje",
    CONTROL_PESO: "control-peso",
    GENERICO: "generico"
  };

  return mapa[tipo] || "generico";
}

function normalizarModo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}
