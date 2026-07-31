export const MODELOS_INFORMES_GP = [
  {
    modelo_key: "CONTROL_SUPERIOR",
    codigo: "CONTROL_SUPERIOR",
    nombre: "CONTROL SUPERIOR",
    label: "CONTROL SUPERIOR",
    html: "/frontend/pantallas/informes/modelos/control-superior/control-superior.html"
  },
  {
    modelo_key: "ALCOHOLEMIA_POSITIVA",
    codigo: "ALCOHOLEMIA_POSITIVA",
    nombre: "ALCOHOLEMIA POSITIVA",
    label: "ALCOHOLEMIA POSITIVA",
    html: "/frontend/pantallas/informes/modelos/alcoholemia-positiva/alcoholemia-positiva.html"
  },
  {
    modelo_key: "DECRETO_460_22",
    codigo: "DECRETO_460_22",
    nombre: "DECTO 460/22",
    label: "DECTO 460/22",
    html: "/frontend/pantallas/informes/modelos/decreto-460-22/decreto-460-22.html"
  }
];

export function listarModelosInformesGP() {
  return MODELOS_INFORMES_GP.map((modelo) => ({
    ...modelo,
    tipo_item: "MODELO_INFORME",
    operativo_key: modelo.modelo_key,
    etiqueta: modelo.label
  }));
}

export function obtenerModeloInformeGP(codigo) {
  const key = normalizarModeloInforme(codigo);

  return MODELOS_INFORMES_GP.find((modelo) => modelo.modelo_key === key || modelo.codigo === key) || null;
}

export function normalizarModeloInforme(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_")
    .replace("DECRETO_460_22", "DECRETO_460_22")
    .replace("DECTO_460_22", "DECRETO_460_22");
}