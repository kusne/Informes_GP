import { iniciarModeloInformeEspecial } from "../../compartido/informe-especial-builder.js";

export async function iniciarAlcoholemiaPositiva({
  operativoSeleccionado,
  getContexto
} = {}) {
  const form = document.querySelector('[data-modelo-informe="ALCOHOLEMIA_POSITIVA"]');

  if (!form) return;

  await iniciarModeloInformeEspecial({
    form,
    modelo: "ALCOHOLEMIA_POSITIVA",
    operativoSeleccionado,
    getContexto
  });
}