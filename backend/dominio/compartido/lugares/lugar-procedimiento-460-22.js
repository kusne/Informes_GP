import { esOperativoPatrullaje } from "../tipos/patrullaje.js";

function normalizar(valor) {
  return String(valor ?? "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/\s+/g, " ").trim();
}

export function obtenerQthOperativo(operativo = {}, lugarAlternativo = "") {
  const datos = operativo?.datos || {};
  const inicio = datos?.inicio_snapshot || {};
  for (const valor of [
    operativo?.lugar, operativo?.qth, operativo?.ubicacion,
    datos?.lugar, datos?.qth, datos?.ubicacion,
    inicio?.lugar, lugarAlternativo
  ]) {
    const qth = String(valor ?? "").trim();
    if (qth && !["SIN LUGAR", "NO TRAE LUGAR", "SIN QTH", "QTH A DETERMINAR", "/"].includes(normalizar(qth))) return qth;
  }
  return "";
}

export function esQthDeRecorridoOTramo(qth) {
  const lugar = normalizar(qth);
  if (!lugar) return true;

  // Un punto como "RN 168 KM 7,5 AMBOS SENTIDOS" es fijo;
  // dos kilómetros, un tramo o un recorrido requieren ubicación precisa.
  if (/\b(?:PATRULLAJE|RECORRIDO|TRAMO|DIVERSOS SECTORES|VARIOS SECTORES)\b/.test(lugar)) return true;
  if (/\b(?:DESDE|ENTRE)\b[\s\S]*\b(?:HASTA|AL|A|Y)\b/.test(lugar)) return true;
  if (/\bKM\s*\d+(?:[.,]\d+)?\s+(?:HASTA|AL)\s+(?:TUNEL|PUENTE|ROTONDA|ACCESO|AVENIDA|CALLE|RUTA|RN|RP|AUTOPISTA|ESTACION)\b/.test(lugar)) return true;
  if (/\b(?:KM|KILOMETRO(?:S)?)\s*\d+(?:[.,]\d+)?\s*(?:AL|A|HASTA|Y|[-–—])\s*(?:KM\s*)?\d+(?:[.,]\d+)?\b/.test(lugar)) return true;
  if (/\b(?:KM|KILOMETRO(?:S)?)\s*\d+(?:[.,]\d+)?\s*(?:AL|A|HASTA|Y|[-–—])\s*KM\b/.test(lugar)) return true;
  const kilometros = [...lugar.matchAll(/\bKM\s*\d+(?:[.,]\d+)?\b/g)];
  if (kilometros.length > 1) return true;
  return false;
}

export function requiereLugarManual46022(operativo = {}, lugarAlternativo = "") {
  const datos = operativo?.datos || {};
  const clasificacionComplementaria = [
    datos?.tipo_nombre, datos?.tipo_operativo, datos?.tipo_descripcion
  ].filter(Boolean).join(" ");
  if (esOperativoPatrullaje(operativo, clasificacionComplementaria)) return true;
  return esQthDeRecorridoOTramo(obtenerQthOperativo(operativo, lugarAlternativo));
}

export function resolverLugarProcedimiento46022(informe = {}) {
  const qth = obtenerQthOperativo(informe.operativo, informe.lugar);
  const manual = requiereLugarManual46022(informe.operativo, informe.lugar);
  const indicado = String(informe?.formulario?.lugar_procedimiento ?? "").trim();
  return {
    requiereManual: manual,
    qth,
    lugar: manual ? indicado : qth
  };
}
