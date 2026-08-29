import { iniciarModeloInformeEspecial } from "../../compartido/informe-especial-builder.js";

export async function iniciarModeloInformeUI({ form } = {}) {
  if (!form) return;

  const tipoVehiculo = form.querySelector('[name="tipo_vehiculo"]');
  const bloque460 = form.querySelector("#alco460Bloque");
  const checkbox460 = form.querySelector('[name="con_decreto_460_22"]');

  const actualizarVisibilidad460 = () => {
    const esMoto = String(tipoVehiculo?.value || "").trim().toUpperCase() === "MOTO";

    if (bloque460) bloque460.hidden = !esMoto;

    // Si el usuario marcó 460/22 y luego cambia el tipo de vehículo,
    // se limpia el valor para que nunca quede activo de forma oculta.
    if (!esMoto && checkbox460?.checked) {
      checkbox460.checked = false;
    }
  };

  tipoVehiculo?.addEventListener("change", actualizarVisibilidad460);
  actualizarVisibilidad460();
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
