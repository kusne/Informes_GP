import { registrarInicioModulo } from "../../../backend/aplicacion/estado/informes-coordinador.js";
import { cargarFotosDeFormulario } from "../../servicios/fotos/fotos-formulario-loader.js";
import { construirInicioDesdeFormulario } from "./compartido/inicio-builder.js";

let ultimoFormularioInicia = null;

export async function iniciarFormularioInicia({
  operativoSeleccionado,
  getContexto
} = {}) {
  const form = document.querySelector(".formulario-inicia");

  ultimoFormularioInicia = form;

  if (!form) {
    registrarInicioModulo({
      actual: null,
      errores: ["No se encontró el formulario de INICIA."],
      texto: "",
      supabasePayload: null
    });
    return;
  }

  await cargarFotosDeFormulario({
    form,
    contexto: {
      ...resolverContexto(getContexto),
      operativoSeleccionado
    }
  });

  const actualizar = () => {
    const resultado = construirInicioDesdeFormulario({
      form,
      operativoSeleccionado,
      contexto: resolverContexto(getContexto)
    });

    if (resultado?.supabasePayload) {
      resultado.supabasePayload.texto_salida = resultado.texto || "";
    }

    registrarInicioModulo(resultado);
  };

  form.addEventListener("input", actualizar);
  form.addEventListener("change", actualizar);
  form.addEventListener("keyup", actualizar);
  form.addEventListener("paste", () => setTimeout(actualizar, 0));

  actualizar();
}

export function obtenerFormularioIniciaActual() {
  return ultimoFormularioInicia;
}

function resolverContexto(getContexto) {
  if (typeof getContexto !== "function") return {};

  try {
    return getContexto() || {};
  } catch {
    return {};
  }
}