import { iniciarModeloInformeEspecial } from "../../compartido/informe-especial-builder.js";

export async function iniciarModeloInformeUI({ form } = {}) {
  if (!form) return;

  const autoridad = form.querySelector('[name="autoridad"]');
  const nombre = form.querySelector('[name="nombre_autoridad"]');

  const completarAutoridad = () => {
    const valor = String(autoridad?.value || "").trim().toUpperCase();
    if (!nombre) return;

    if (valor === "JEFE") {
      nombre.value = "SubCrio Choque Jose Maria";
    } else if (valor === "SUBJEFE") {
      nombre.value = "Inspector Tramontini Ismael";
    } else if (valor === "") {
      nombre.value = "";
    }

    nombre.dispatchEvent(new Event("input", { bubbles: true }));
  };

  autoridad?.addEventListener("change", completarAutoridad);
}

export async function iniciarControlSuperior({
  operativoSeleccionado,
  getContexto
} = {}) {
  const form = document.querySelector('[data-modelo-informe="CONTROL_SUPERIOR"]');
  if (!form) return;

  await iniciarModeloInformeUI({ form });
  await iniciarModeloInformeEspecial({
    form,
    modelo: "CONTROL_SUPERIOR",
    operativoSeleccionado,
    getContexto
  });
}
