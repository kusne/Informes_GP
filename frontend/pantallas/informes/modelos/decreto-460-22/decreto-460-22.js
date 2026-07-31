import { iniciarModeloInformeEspecial } from "../../compartido/informe-especial-builder.js";

export async function iniciarDecreto46022({
  operativoSeleccionado,
  getContexto
} = {}) {
  const form = document.querySelector('[data-modelo-informe="DECRETO_460_22"]');

  if (!form) return;

  await iniciarModeloInformeEspecial({
    form,
    modelo: "DECRETO_460_22",
    operativoSeleccionado,
    getContexto
  });
}