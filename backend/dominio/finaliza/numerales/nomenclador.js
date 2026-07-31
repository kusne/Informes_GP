export const NOMENCLADOR_NUMERALES = {
  "1301": {
    codigo: "1301",
    descripcion: "ACTA / INFRACCIÓN",
    categoria: "ACTAS"
  },
  "9119": {
    codigo: "9119",
    descripcion: "NO POSEE LICENCIA / DNI",
    categoria: "LICENCIA"
  },
  "2016": {
    codigo: "2016",
    descripcion: "ALCOHOLEMIA POSITIVA SANCIONABLE",
    categoria: "ALCOHOLEMIA"
  },
  "2020": {
    codigo: "2020",
    descripcion: "ALCOHOLEMIA POSITIVA SANCIONABLE MOTO",
    categoria: "ALCOHOLEMIA"
  },
  "2033": {
    codigo: "2033",
    descripcion: "ALCOHOLEMIA POSITIVA SANCIONABLE TRANSPORTE / CARGA",
    categoria: "ALCOHOLEMIA"
  }
};

export function buscarNumeral(codigo) {
  const key = String(codigo || "").trim();
  return NOMENCLADOR_NUMERALES[key] || null;
}
