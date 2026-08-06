import { extraerCodigosFalta, getNomencladorFalta } from "../finaliza/numerales/nomenclador.js";

export function construirNumeralesSugeridosInforme(informe) {
  if (!informe) return [];

  if (informe.modelo === "ALCOHOLEMIA_POSITIVA") {
    return construirNumeralesAlcoholemia(informe);
  }

  if (informe.modelo === "DECRETO_460_22") {
    return construirNumeralesDecreto46022(informe);
  }

  return [];
}

export function construirIncrementosSugeridosInforme(informe) {
  if (!informe) return {};

  if (informe.modelo === "ALCOHOLEMIA_POSITIVA") {
    const sancionable = Boolean(informe.calculos?.sancionable);
    const con460 = Boolean(informe.formulario?.con_decreto_460_22);

    return limpiarObjeto({
      actas: sancionable ? 1 : 0,
      personas: 1,
      vehiculos: 1,
      decreto_460_22: con460 ? 1 : 0,
      alcoholemia_sancionable: sancionable ? 1 : 0,
      alcoholemia_no_sancionable: sancionable ? 0 : 1,
      retencion_licencia: debeSugerirRetencionLicencia(informe) ? 1 : 0
    });
  }

  if (informe.modelo === "DECRETO_460_22") {
    return {
      actas: 1,
      personas: 1,
      vehiculos: 1,
      decreto_460_22: 1
    };
  }

  return {};
}

function construirNumeralesAlcoholemia(informe) {
  const f = informe.formulario || {};
  const c = informe.calculos || {};
  const items = [];

  if (c.sancionable) {
    items.push({
      codigo: c.codigo_sancionable || "2016",
      cantidad: 1,
      detalle: "ALCOHOLEMIA POSITIVA SANCIONABLE",
      categoria: "ALCOHOLEMIA"
    });
  } else {
    items.push({
      codigo: "ALCO_NO_SANC",
      cantidad: 1,
      detalle: "ALCOHOLEMIA POSITIVA NO SANCIONABLE",
      categoria: "ALCOHOLEMIA"
    });
  }

  if (debeSugerirRetencionLicencia(informe)) {
    items.push({
      codigo: "RET_LIC",
      cantidad: 1,
      detalle: "RETENCIÓN DE LICENCIA",
      categoria: "LICENCIA"
    });
  }

  if (debeSugerirSinLicencia(f)) {
    items.push({
      codigo: "9119",
      cantidad: 1,
      detalle: "NO POSEE LICENCIA DE CONDUCIR",
      categoria: "LICENCIA"
    });
  }

  if (Boolean(f.con_decreto_460_22)) {
    items.push({
      codigo: "460/22",
      cantidad: 1,
      detalle: "PROCEDIMIENTO POR DECRETO 460/22",
      categoria: "DECRETO"
    });
  }

  return consolidarItems(items);
}

function construirNumeralesDecreto46022(informe) {
  const items = [
    {
      codigo: "460/22",
      cantidad: 1,
      detalle: "PROCEDIMIENTO POR DECRETO 460/22",
      categoria: "DECRETO"
    }
  ];

  for (const codigo of extraerCodigosFalta(informe?.formulario?.codigos_infraccion)) {
    const item = getNomencladorFalta(codigo);
    if (!item) continue;
    items.push({
      codigo,
      cantidad: 1,
      detalle: String(item.referencia || "INFRACCIÓN").toUpperCase(),
      categoria: "INFRACCION"
    });
  }

  return consolidarItems(items);
}

function debeSugerirRetencionLicencia(informe) {
  const f = informe.formulario || {};
  const c = informe.calculos || {};

  if (!c.sancionable) return false;
  if (Boolean(f.licencia_digital)) return false;

  const clase = String(f.clase || "").trim();

  if (!clase) return false;
  if (debeSugerirSinLicencia(f)) return false;

  return true;
}

function debeSugerirSinLicencia(formulario) {
  const clase = String(formulario?.clase || "").trim();

  return /\d{7,8}/.test(clase);
}

function consolidarItems(items) {
  const mapa = new Map();

  for (const item of items) {
    const key = `${item.codigo}::${item.detalle}`;

    if (!mapa.has(key)) {
      mapa.set(key, { ...item });
    } else {
      mapa.get(key).cantidad += Number(item.cantidad || 1);
    }
  }

  return Array.from(mapa.values());
}

function limpiarObjeto(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, valor]) => valor !== undefined)
  );
}