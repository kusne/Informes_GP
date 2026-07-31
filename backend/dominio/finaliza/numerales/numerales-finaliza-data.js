export const NOMENCLADOR_FINALIZA_FALLBACK = [
  {
    codigo: "2016",
    detalle: "ALCOHOLEMIA POSITIVA SANCIONABLE",
    categoria: "ALCOHOLEMIA"
  },
  {
    codigo: "2020",
    detalle: "ALCOHOLEMIA POSITIVA SANCIONABLE EN MOTOVEHÍCULO",
    categoria: "ALCOHOLEMIA"
  },
  {
    codigo: "2033",
    detalle: "ALCOHOLEMIA POSITIVA SANCIONABLE TRANSPORTE / CAMIÓN / CHASIS / TRACTOR / CARRETÓN",
    categoria: "ALCOHOLEMIA"
  },
  {
    codigo: "460/22",
    detalle: "PROCEDIMIENTO POR DECRETO 460/22",
    categoria: "DECRETO"
  },
  {
    codigo: "9119",
    detalle: "NO POSEE LICENCIA DE CONDUCIR",
    categoria: "LICENCIA"
  },
  {
    codigo: "RET_LIC",
    detalle: "RETENCIÓN DE LICENCIA",
    categoria: "LICENCIA"
  },
  {
    codigo: "ARMAS",
    detalle: "CONTROL DE ARMAS",
    categoria: "CONTROL"
  },
  {
    codigo: "ACTA",
    detalle: "ACTA DE INFRACCIÓN",
    categoria: "ACTAS"
  }
];

export function buscarNumeralPorCodigo(codigo) {
  const normalizado = normalizarCodigo(codigo);

  if (!normalizado) return null;

  return NOMENCLADOR_FINALIZA_FALLBACK.find((item) => normalizarCodigo(item.codigo) === normalizado) || null;
}

export function normalizarCodigo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(",", ".");
}