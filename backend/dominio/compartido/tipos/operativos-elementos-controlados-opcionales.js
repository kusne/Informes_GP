import {
  esPresenciaActivaPuenteCarretero,
  hayControladosFinaliza,
  CAMPOS_CONTROLADOS
} from "./presencia-activa-puente.js";

/**
 * Detecta Ordenamiento Vehicular de forma tolerante a pequeñas faltas
 * ortográficas en la denominación recibida.
 */
export function esOrdenamientoVehicular(operativo = {}, tipoFallback = "") {
  const fuente = fuenteOperativoNormalizada(operativo, tipoFallback);
  if (!fuente) return false;

  const palabras = fuente.split(/\s+/).filter(Boolean);
  const ordenamientoAproximado = palabras.some((palabra) =>
    distanciaLevenshtein(palabra, "ORDENAMIENTO") <= 2
  );
  const ordenVehicular = fuente.includes("VEHICULAR") && /\bORDEN\w*/.test(fuente);

  return ordenamientoAproximado || ordenVehicular;
}

export function esPresenciaActiva(operativo = {}, tipoFallback = "") {
  return fuenteOperativoNormalizada(operativo, tipoFallback).includes("PRESENCIA ACTIVA");
}

export function esPuenteCarretero(operativo = {}, tipoFallback = "") {
  const fuente = fuenteOperativoNormalizada(operativo, tipoFallback);
  const lugar = normalizar([
    operativo?.lugar,
    operativo?.qth,
    operativo?.ubicacion
  ].filter(Boolean).join(" "));
  return fuente.includes("PUENTE CARRETERO") || lugar.includes("PUENTE CARRETERO");
}

export function esOperativoNocturnidad(operativo = {}, tipoFallback = "") {
  const fuente = fuenteOperativoNormalizada(operativo, tipoFallback);
  return fuente.includes("NOCTURNIDAD") || fuente.includes("BOLICHES BAILABLES") || fuente.includes("ZONA DE BOLICHES");
}

/** Detecta operativos de RETORNO, sin depender de mayúsculas/minúsculas. */
export function esOperativoRetorno(operativo = {}, tipoFallback = "") {
  return fuenteOperativoNormalizada(operativo, tipoFallback).includes("RETORNO");
}

/** Detecta operativos de ÉXODO/EXODO, tolerando acentos y capitalización. */
export function esOperativoExodo(operativo = {}, tipoFallback = "") {
  return fuenteOperativoNormalizada(operativo, tipoFallback).includes("EXODO");
}

export function esOperativoRetornoOExodo(operativo = {}, tipoFallback = "") {
  return esOperativoRetorno(operativo, tipoFallback) || esOperativoExodo(operativo, tipoFallback);
}

/**
 * En RETORNO/ÉXODO, cuando la orden llega con fin abierto (A FINALIZAR),
 * el FINALIZA usa la hora real en que se genera el informe.
 */
export function resolverHoraFinFinalizadoEspecial(operativo = {}, tipoFallback = "", ahora = new Date()) {
  const horaFinOriginal = String(
    operativo?.hora_fin || operativo?.hora_finalizacion || operativo?.fin || ""
  ).trim();
  const franja = String(operativo?.franja_horaria || operativo?.horario || "").trim();

  if (!esOperativoRetornoOExodo(operativo, tipoFallback)) return horaFinOriginal;

  const finAbierto = normalizar(horaFinOriginal).includes("FINALIZAR") ||
    normalizar(franja).includes("FINALIZAR");

  if (!finAbierto) return horaFinOriginal;

  const fecha = ahora instanceof Date ? ahora : new Date(ahora);
  const valida = Number.isFinite(fecha.getTime()) ? fecha : new Date();
  return `${String(valida.getHours()).padStart(2, "0")}:${String(valida.getMinutes()).padStart(2, "0")}`;
}

/**
 * Tipos cuyo INICIA oculta Elementos y muestra "Agregar Elementos".
 */
export function usaElementosOpcionalesInicio(operativo = {}, tipoFallback = "") {
  return esPresenciaActivaPuenteCarretero(operativo, tipoFallback) ||
    esOrdenamientoVehicular(operativo, tipoFallback) ||
    esOperativoRetornoOExodo(operativo, tipoFallback);
}

/**
 * Tipos cuyo FINALIZA no debe imprimir Resultados por defecto. Para estos
 * casos la interfaz muestra el check "Agregar resultados". Si el usuario no
 * lo tilda, Resultados y Detalles quedan fuera de la salida.
 */
export function usaControladosOpcionalesFinaliza(operativo = {}, tipoFallback = "") {
  return esPresenciaActiva(operativo, tipoFallback) ||
    esPuenteCarretero(operativo, tipoFallback) ||
    esOperativoNocturnidad(operativo, tipoFallback) ||
    esOrdenamientoVehicular(operativo, tipoFallback) ||
    esOperativoRetornoOExodo(operativo, tipoFallback);
}

/**
 * Estos tipos pueden llegar al FINALIZA con Elementos vacíos porque
 * en su INICIA el bloque es opt-in.
 */
export function permiteElementosVaciosFinaliza(operativo = {}, tipoFallback = "") {
  return usaElementosOpcionalesInicio(operativo, tipoFallback);
}

export { hayControladosFinaliza, CAMPOS_CONTROLADOS };

function fuenteOperativoNormalizada(operativo = {}, tipoFallback = "") {
  return normalizar([
    tipoFallback,
    operativo?.tipo_operativo,
    operativo?.tipo_codigo,
    operativo?.tipo_nombre,
    operativo?.tipo_original,
    operativo?.tipo_descripcion,
    operativo?.titulo,
    operativo?.tipo,
    operativo?.descripcion,
    operativo?.detalle,
    operativo?.observacion,
    operativo?.etiqueta,
    operativo?.datos?.tipo_original,
    operativo?.registro_original?.tipo
  ].filter(Boolean).join(" "));
}

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[–—]/g, "-")
    .replace(/[_-]+/g, " ")
    .replace(/[^A-Z0-9°/. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distanciaLevenshtein(a, b) {
  const aa = String(a || "");
  const bb = String(b || "");
  if (!aa) return bb.length;
  if (!bb) return aa.length;

  const fila = Array.from({ length: bb.length + 1 }, (_, i) => i);
  for (let i = 1; i <= aa.length; i += 1) {
    let diagonal = fila[0];
    fila[0] = i;
    for (let j = 1; j <= bb.length; j += 1) {
      const anterior = fila[j];
      const costo = aa[i - 1] === bb[j - 1] ? 0 : 1;
      fila[j] = Math.min(
        fila[j] + 1,
        fila[j - 1] + 1,
        diagonal + costo
      );
      diagonal = anterior;
    }
  }
  return fila[bb.length];
}
