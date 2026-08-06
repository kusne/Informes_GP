import { iniciarModeloInformeEspecial } from "../../compartido/informe-especial-builder.js";
import { extraerCodigosFalta } from "../../../../../backend/dominio/finaliza/numerales/nomenclador.js";

export async function iniciarModeloInformeUI({ form } = {}) {
  if (!form) return;

  const codigos = form.querySelector('[name="codigos_infraccion"]');
  codigos?.addEventListener("blur", () => {
    const lista = extraerCodigosFalta(codigos.value);
    if (!lista.length) return;
    codigos.value = lista.join(", ");
    codigos.dispatchEvent(new Event("input", { bubbles: true }));
  });
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
