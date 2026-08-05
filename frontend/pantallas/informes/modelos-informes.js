export const MODELOS_INFORMES_GP = [
  {
    modelo_key: "CONTROL_SUPERIOR",
    codigo: "CONTROL_SUPERIOR",
    nombre: "CONTROL SUPERIOR",
    label: "CONTROL SUPERIOR",
    html: "/frontend/pantallas/informes/modelos/control-superior/control-superior.html",
    modulo: "/frontend/pantallas/informes/modelos/control-superior/control-superior.js"
  },
  {
    modelo_key: "ALCOHOLEMIA_POSITIVA",
    codigo: "ALCOHOLEMIA_POSITIVA",
    nombre: "ALCOHOLEMIA POSITIVA",
    label: "ALCOHOLEMIA POSITIVA",
    html: "/frontend/pantallas/informes/modelos/alcoholemia-positiva/alcoholemia-positiva.html",
    modulo: "/frontend/pantallas/informes/modelos/alcoholemia-positiva/alcoholemia-positiva.js"
  },
  {
    modelo_key: "DECRETO_460_22",
    codigo: "DECRETO_460_22",
    nombre: "DECTO 460/22",
    label: "DECTO 460/22",
    html: "/frontend/pantallas/informes/modelos/decreto-460-22/decreto-460-22.html",
    modulo: "/frontend/pantallas/informes/modelos/decreto-460-22/decreto-460-22.js"
  },
  {
    modelo_key: "CONTROL_ARMAS",
    codigo: "CONTROL_ARMAS",
    nombre: "CONTROL DE ARMAS",
    label: "CONTROL DE ARMAS",
    html: "/frontend/pantallas/informes/modelos/control-armas/control-armas.html",
    modulo: "/frontend/pantallas/informes/modelos/control-armas/control-armas.js"
  },
  {
    modelo_key: "RETENCION_LICENCIA",
    codigo: "RETENCION_LICENCIA",
    nombre: "RETENCIÓN DE LICENCIA",
    label: "RETENCIÓN DE LICENCIA",
    html: "/frontend/pantallas/informes/modelos/retencion-licencia/retencion-licencia.html",
    modulo: "/frontend/pantallas/informes/modelos/retencion-licencia/retencion-licencia.js"
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