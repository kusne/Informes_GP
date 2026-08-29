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
    const f = informe.formulario || {};
    const c = informe.calculos || {};
    const sancionable = Boolean(c.sancionable);
    const con460 = Boolean(c.con_decreto_460_22);

    return limpiarObjeto({
      actas: sancionable ? 1 : 0,
      personas: 1,
      vehiculos: 1,
      decreto_460_22: con460 ? 1 : 0,
      alcoholemia_sancionable: sancionable ? 1 : 0,
      alcoholemia_no_sancionable: sancionable ? 0 : 1,
      // La retención ya no se infiere: la define expresamente el usuario
      // mediante la medida cautelar "Retención" del formulario.
      retencion_licencia: Boolean(f.medida_retencion) ? 1 : 0
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
    agregarItemUnico(items, {
      codigo: c.codigo_sancionable || "2016",
      cantidad: 1,
      detalle: "ALCOHOLEMIA POSITIVA SANCIONABLE",
      categoria: "ALCOHOLEMIA"
    });
  } else {
    agregarItemUnico(items, {
      codigo: "ALCO_NO_SANC",
      cantidad: 1,
      detalle: "ALCOHOLEMIA POSITIVA NO SANCIONABLE",
      categoria: "ALCOHOLEMIA"
    });
  }

  for (const codigo of extraerCodigosFalta(f.otros_codigos)) {
    const item = getNomencladorFalta(codigo);
    if (!item) continue;

    agregarItemUnico(items, {
      codigo,
      cantidad: 1,
      detalle: String(item.referencia || "INFRACCIÓN").toUpperCase(),
      categoria: "INFRACCION"
    });
  }

  if (Boolean(f.medida_retencion)) {
    agregarItemUnico(items, {
      codigo: "RET_LIC",
      cantidad: 1,
      detalle: "RETENCIÓN DE LICENCIA",
      categoria: "LICENCIA"
    });
  }

  if (debeSugerirSinLicencia(f)) {
    agregarItemUnico(items, {
      codigo: "9119",
      cantidad: 1,
      detalle: "NO POSEE LICENCIA DE CONDUCIR",
      categoria: "LICENCIA"
    });
  }

  if (Boolean(c.con_decreto_460_22)) {
    agregarItemUnico(items, {
      codigo: "460/22",
      cantidad: 1,
      detalle: "PROCEDIMIENTO POR DECRETO 460/22",
      categoria: "DECRETO"
    });
  }

  return items;
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

function debeSugerirSinLicencia(formulario) {
  const clase = String(formulario?.clase || "").trim();
  return /\b\d{7,8}\b/.test(clase);
}

function agregarItemUnico(items, item) {
  const codigo = String(item?.codigo || "").trim();
  if (!codigo) return;
  if (items.some((actual) => String(actual?.codigo || "").trim() === codigo)) return;
  items.push({ ...item });
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
