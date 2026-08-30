import { iniciarModeloInformeEspecial } from "../../compartido/informe-especial-builder.js";

export async function iniciarModeloInformeUI({ form } = {}) {
  if (!form) return;

  const tipoVehiculo = form.querySelector('[name="tipo_vehiculo"]');
  const bloque460 = form.querySelector("#alco460Bloque");
  const checkbox460 = form.querySelector('[name="con_decreto_460_22"]');
  const campoLicenciaDni = form.querySelector('[name="clase"]');
  const checkboxLicenciaDigital = form.querySelector('[name="licencia_digital"]');
  const checkboxRetencion = form.querySelector('[name="medida_retencion"]');

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

  // Licencia física: si "Lic. digital" está destildada y el campo
  // Licencia / DNI contiene una clase de licencia (no un DNI), la
  // medida cautelar Retención aparece tildada por defecto.
  // Sigue siendo editable: si el usuario la destilda manualmente,
  // no se vuelve a marcar mientras continúe la misma condición.
  let licenciaFisicaAnterior = false;
  let retencionMarcadaAutomaticamente = false;

  const contieneDni = (valor) => /\d{7,8}/.test(String(valor || ""));

  const actualizarRetencionLicenciaFisica = () => {
    const valorLicencia = String(campoLicenciaDni?.value || "").trim();
    const licenciaFisica = Boolean(valorLicencia)
      && !Boolean(checkboxLicenciaDigital?.checked)
      && !contieneDni(valorLicencia);

    if (licenciaFisica && !licenciaFisicaAnterior && checkboxRetencion) {
      if (!checkboxRetencion.checked) {
        checkboxRetencion.checked = true;
        retencionMarcadaAutomaticamente = true;
      }
    } else if (!licenciaFisica && retencionMarcadaAutomaticamente && checkboxRetencion) {
      checkboxRetencion.checked = false;
      retencionMarcadaAutomaticamente = false;
    }

    licenciaFisicaAnterior = licenciaFisica;
  };

  checkboxRetencion?.addEventListener("change", () => {
    // Desde este momento prevalece la elección manual del usuario.
    retencionMarcadaAutomaticamente = false;
  });
  campoLicenciaDni?.addEventListener("input", actualizarRetencionLicenciaFisica);
  campoLicenciaDni?.addEventListener("change", actualizarRetencionLicenciaFisica);
  checkboxLicenciaDigital?.addEventListener("change", actualizarRetencionLicenciaFisica);
  actualizarRetencionLicenciaFisica();
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
