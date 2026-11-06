import { iniciarModeloInformeEspecial } from "../../compartido/informe-especial-builder.js";
import { iniciarSelectorJuzgado } from "../../compartido/selector-juzgado.js";
import { resolverRetencionPorLicenciaDni } from "../../../../../backend/dominio/informes/licencia-dni-alcoholemia.js";

export async function iniciarModeloInformeUI({ form } = {}) {
  if (!form) return;

  const tipoVehiculo = form.querySelector('[name="tipo_vehiculo"]');
  const bloque460 = form.querySelector("#alco460Bloque");
  const checkbox460 = form.querySelector('[name="con_decreto_460_22"]');
  const campoLicenciaDni = form.querySelector('[name="clase"]');
  const checkboxLicenciaDigital = form.querySelector('[name="licencia_digital"]');
  const checkboxRetencion = form.querySelector('[name="medida_retencion"]');
  let actualizarJuzgado = () => {};

  // Normalización visual y de valor: todo texto escrito por el usuario
  // en los campos de Alcoholemia se transforma inmediatamente a MAYÚSCULAS.
  // Los campos numéricos/decimales no se alteran.
  const camposTextoMayusculas = Array.from(
    form.querySelectorAll('input[type="text"], textarea')
  ).filter((campo) => !["numero_acta", "resultado", "otros_codigos"].includes(campo.name));

  const normalizarCampoMayusculas = (campo) => {
    if (!campo) return;
    const inicio = Number.isInteger(campo.selectionStart) ? campo.selectionStart : null;
    const fin = Number.isInteger(campo.selectionEnd) ? campo.selectionEnd : null;
    const nuevoValor = String(campo.value || "").toLocaleUpperCase("es-AR");
    if (campo.value !== nuevoValor) {
      campo.value = nuevoValor;
      if (inicio !== null && fin !== null && typeof campo.setSelectionRange === "function") {
        try { campo.setSelectionRange(inicio, fin); } catch {}
      }
    }
  };

  for (const campo of camposTextoMayusculas) {
    campo.addEventListener("input", () => normalizarCampoMayusculas(campo));
    campo.addEventListener("change", () => normalizarCampoMayusculas(campo));
    normalizarCampoMayusculas(campo);
  }

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

  // ACOTADO AL INFORME DE ALCOHOLEMIA:
  // clase física (B2, A1.3, F...) => Retención sugerida tildada;
  // DNI aislado de 8 cifras (30787085) => Retención destildada.
  // Conservar edición manual mientras siga siendo la misma clase física.
  let tipoLicenciaAnterior = "SIN_DATO";
  let retencionMarcadaAutomaticamente = false;

  const actualizarRetencionLicenciaFisica = () => {
    if (!checkboxRetencion) return;
    const siguiente = resolverRetencionPorLicenciaDni({
      valor: campoLicenciaDni?.value,
      licenciaDigital: Boolean(checkboxLicenciaDigital?.checked),
      tipoAnterior: tipoLicenciaAnterior,
      retencionMarcada: checkboxRetencion.checked,
      marcadaAutomaticamente: retencionMarcadaAutomaticamente
    });
    checkboxRetencion.checked = siguiente.marcada;
    retencionMarcadaAutomaticamente = siguiente.automatica;
    tipoLicenciaAnterior = siguiente.tipo;
    actualizarJuzgado();
  };

  checkboxRetencion?.addEventListener("change", () => {
    // La medida sigue siendo editable; un DNI nuevo la desmarca por seguridad.
    retencionMarcadaAutomaticamente = false;
  });
  campoLicenciaDni?.addEventListener("input", actualizarRetencionLicenciaFisica);
  campoLicenciaDni?.addEventListener("change", actualizarRetencionLicenciaFisica);
  checkboxLicenciaDigital?.addEventListener("change", actualizarRetencionLicenciaFisica);
  actualizarRetencionLicenciaFisica();
  // En ALCOHOLEMIA el juzgado se elige también cuando no hay retención.
  // No modificar el selector compartido usado por otros modelos.
  actualizarJuzgado = iniciarSelectorJuzgado(form);
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
