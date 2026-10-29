// Presentación institucional de títulos y QTH sin alterar el texto fuente
// ni los números de orden. La detección de palabras usa letras Unicode:
// \b trata las vocales acentuadas como no-palabra y producía "EnergÍa".
const SIGLAS = /\b(?:OCV|DICEP|EPE|APRAD|UFIV|ASSAL|QRZ|RN|RP|KM|HT|PDA|OP)\b/giu;
const NEXOS = /(?<=\s)(?:En|Por|De|Del|La|Las|Los|El|Con|Para|Al)(?=\s|$)/gu;

function capitalizarPalabrasUnicode(valor) {
  return String(valor ?? "").replace(/(^|[^\p{L}\p{M}])(\p{L})/gu,
    (_, separador, letra) => separador + letra.toLocaleUpperCase("es-AR"));
}

function textoLegible(valor) {
  const base = String(valor ?? "").replaceAll("_", " ").replace(/\s+/g, " ").trim();
  return capitalizarPalabrasUnicode(base.toLocaleLowerCase("es-AR"));
}

export function formatearTituloOperativo(valor) {
  return textoLegible(valor)
    .replace(NEXOS, palabra => palabra.toLocaleLowerCase("es-AR"))
    .replace(SIGLAS, sigla => sigla.toLocaleUpperCase("es-AR"));
}

export function formatearLugarOperativo(valor) {
  const lugar = String(valor ?? "").trim();
  if (!lugar) return "/";
  return textoLegible(lugar)
    .replace(/\b(?:RN|RP|KM)\b/giu, sigla => sigla.toLocaleUpperCase("es-AR"));
}
