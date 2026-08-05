import { iniciarModeloInformeEspecial } from "../../compartido/informe-especial-builder.js";

export async function iniciarModeloInformeUI() {
  // Este modelo no requiere lógica visual adicional; los datos del operativo
  // se resuelven en el builder compartido.
}

export async function iniciarDecreto46022({
  operativoSeleccionado,
  getContexto
} = {}) {
  const form = document.querySelector('[data-modelo-informe="DECRETO_460_22"]');
  if (!form) return;

  await iniciarModeloInformeUI({ form, operativoSeleccionado });
  await iniciarModeloInformeEspecial({
    form,
    modelo: "DECRETO_460_22",
    operativoSeleccionado,
    getContexto
  });
}
