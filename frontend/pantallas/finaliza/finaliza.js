import { registrarFinalizadoModulo } from "../../../backend/aplicacion/estado/informes-coordinador.js";
import { cargarFotosDeFormulario } from "../../servicios/fotos/fotos-formulario-loader.js";
import {
  cargarNumeralesFinaliza,
  limpiarNumeralesFinaliza
} from "./numerales/numerales-finaliza.js";
import { construirFinalizadoDesdeFormulario } from "./compartido/finalizado-builder.js";

let ultimoFormularioFinaliza = null;

export async function iniciarFormularioFinaliza({
  operativoSeleccionado,
  getContexto
} = {}) {
  const form = document.querySelector(".formulario-finaliza");

  ultimoFormularioFinaliza = form;

  if (!form) {
    registrarFinalizadoModulo({
      actual: null,
      errores: ["No se encontró el formulario de FINALIZA."],
      texto: "",
      supabasePayload: null
    });
    return;
  }

  limpiarNumeralesFinaliza({
    publicar: true
  });

  await cargarNumeralesFinaliza({
    form,
    contexto: {
      ...resolverContexto(getContexto),
      operativoSeleccionado
    },
    limpiar: false
  });

  await cargarFotosDeFormulario({
    form,
    contexto: {
      ...resolverContexto(getContexto),
      operativoSeleccionado
    }
  });

  const actualizar = () => {
    const resultado = construirFinalizadoDesdeFormulario({
      form,
      operativoSeleccionado,
      contexto: resolverContexto(getContexto)
    });

    if (resultado?.supabasePayload) {
      resultado.supabasePayload.texto_salida = resultado.texto || "";
    }

    registrarFinalizadoModulo(resultado);
  };

  form.addEventListener("input", actualizar);
  form.addEventListener("change", actualizar);
  form.addEventListener("keyup", actualizar);
  form.addEventListener("paste", () => setTimeout(actualizar, 0));

  actualizar();
}

export function obtenerFormularioFinalizaActual() {
  return ultimoFormularioFinaliza;
}

function resolverContexto(getContexto) {
  if (typeof getContexto !== "function") return {};

  try {
    return getContexto() || {};
  } catch {
    return {};
  }
}