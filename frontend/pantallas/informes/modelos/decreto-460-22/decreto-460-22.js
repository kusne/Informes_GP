import { iniciarModeloInformeEspecial } from "../../compartido/informe-especial-builder.js";
import { extraerCodigosFalta } from "../../../../../api/app-api.js";
import { iniciarSelectorJuzgado } from "../../compartido/selector-juzgado.js";
import {
  obtenerQthOperativo,
  requiereLugarManual46022
} from "../../../../../backend/dominio/compartido/lugares/lugar-procedimiento-460-22.js";

export async function iniciarModeloInformeUI({ form, operativoSeleccionado } = {}) {
  if (!form) return () => null;

  let operativoActual = operativoSeleccionado || null;
  const lugar = form.querySelector('[name="lugar_procedimiento"]');
  const avisoLugar = form.querySelector("[data-aviso-lugar-procedimiento]");

  const actualizarLugar = (operativo) => {
    if (!lugar) return;
    const qth = obtenerQthOperativo(operativo);
    const requiereManual = requiereLugarManual46022(operativo);
    const identidad = [
      operativo?.operativo_key || operativo?.id || "",
      operativo?.guardia_fecha || "",
      operativo?.tipo_nombre || operativo?.tipo_operativo || "",
      qth,
      requiereManual ? "MANUAL" : "FIJO"
    ].join("|");

    // Al seleccionar otro operativo, jamás se arrastra un lugar manual anterior.
    if (lugar.dataset.operativoLugarClave !== identidad) {
      lugar.value = requiereManual ? "" : qth;
      lugar.dataset.operativoLugarClave = identidad;
    } else if (!requiereManual) {
      lugar.value = qth;
    }

    lugar.readOnly = !requiereManual;
    lugar.required = true;
    lugar.placeholder = requiereManual
      ? "Ingresá el lugar exacto del procedimiento"
      : "Lugar del operativo";
    if (avisoLugar) avisoLugar.hidden = !requiereManual;
  };

  actualizarLugar(operativoActual);
  form.addEventListener("informesgp:operativo-informe-actualizado", (evento) => {
    if (evento.detail && Object.prototype.hasOwnProperty.call(evento.detail, "operativoSeleccionado")) {
      operativoActual = evento.detail.operativoSeleccionado || null;
    }
    actualizarLugar(operativoActual);
  });

  iniciarSelectorJuzgado(form);
  const codigos = form.querySelector('[name="codigos_infraccion"]');
  codigos?.addEventListener("blur", () => {
    const lista = extraerCodigosFalta(codigos.value);
    if (!lista.length) return;
    codigos.value = lista.join(", ");
    codigos.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return () => operativoActual;
}

export async function iniciarDecreto46022({
  operativoSeleccionado,
  getContexto
} = {}) {
  const form = document.querySelector('[data-modelo-informe="DECRETO_460_22"]');
  if (!form) return;

  const getOperativoSeleccionado = await iniciarModeloInformeUI({ form, operativoSeleccionado });
  await iniciarModeloInformeEspecial({
    form,
    modelo: "DECRETO_460_22",
    operativoSeleccionado,
    getOperativoSeleccionado,
    getContexto
  });
}
