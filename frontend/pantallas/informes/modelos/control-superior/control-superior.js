import { iniciarModeloInformeEspecial } from "../../compartido/informe-especial-builder.js";

export async function iniciarModeloInformeUI({ form } = {}) {
  if (!form) return;

  const otros = form.querySelector('[name="autoridad_otros"]');
  const nombreBloque = form.querySelector("#controlSuperiorNombreBloque");
  const nombre = form.querySelector('[name="nombre_autoridad"]');
  const movilOtro = form.querySelector('[name="movil_otro"]');
  const movilOtroBloque = form.querySelector("#controlSuperiorMovilOtroBloque");
  const movilesOtros = form.querySelector('[name="moviles_otros"]');

  const actualizarAutoridadOtros = () => {
    const visible = Boolean(otros?.checked);
    if (nombreBloque) nombreBloque.hidden = !visible;
    if (!visible && nombre) {
      nombre.value = "";
      nombre.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const actualizarMovilOtro = () => {
    const visible = Boolean(movilOtro?.checked);
    if (movilOtroBloque) movilOtroBloque.hidden = !visible;
    if (!visible && movilesOtros) {
      movilesOtros.value = "";
      movilesOtros.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  otros?.addEventListener("change", actualizarAutoridadOtros);
  movilOtro?.addEventListener("change", actualizarMovilOtro);
  actualizarAutoridadOtros();
  actualizarMovilOtro();
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
