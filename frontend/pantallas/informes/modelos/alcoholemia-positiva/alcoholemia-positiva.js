import { iniciarModeloInformeEspecial } from "../../compartido/informe-especial-builder.js";

export async function iniciarModeloInformeUI() {
  // Este modelo no requiere lógica visual adicional; los datos del operativo
  // se resuelven en el builder compartido.
}

export async function iniciarAlcoholemiaPositiva({
  operativoSeleccionado,
  getContexto
} = {}) {
  const form = document.querySelector('[data-modelo-informe="ALCOHOLEMIA_POSITIVA"]');
  if (!form) return;

  await iniciarModeloInformeUI({ form, operativoSeleccionado });
  await iniciarModeloInformeEspecial({
    form,
    modelo: "ALCOHOLEMIA_POSITIVA",
    operativoSeleccionado,
    getContexto
  });
}
