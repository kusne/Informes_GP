import { registrarInformeModulo } from "../../../../backend/aplicacion/estado/informes-coordinador.js";
import { construirInformeEspecial } from "./informe-especial-builder.js";
import { validarInformeEspecial } from "../../../../backend/dominio/informes/informe-especial-validaciones.js";
import { construirTextoInformeEspecial } from "../../../../backend/dominio/informes/informe-especial-salida-texto.js";
import { mapearInformeEspecialParaSupabase } from "../../../../backend/dominio/informes/informe-especial-mapper-supabase.js";

let limpiarObservadorActual = null;

export function iniciarInformeEspecial({
  root = document,
  modelo,
  modeloSlug,
  operativoSeleccionado,
  getContexto
}) {
  if (typeof limpiarObservadorActual === "function") {
    limpiarObservadorActual();
    limpiarObservadorActual = null;
  }

  const form = root.querySelector(".formulario-informe-especial");
  if (!form) return;

  const handler = () => {
    const informe = construirInformeEspecial({
      root,
      modelo,
      modeloSlug,
      operativoSeleccionado
    });

    const errores = validarInformeEspecial(informe);
    const texto = construirTextoInformeEspecial(informe);
    const supabasePayload = mapearInformeEspecialParaSupabase(informe);

    registrarInformeModulo({
      actual: informe,
      errores,
      texto,
      supabasePayload
    });

    window.InformesGP = window.InformesGP || {};
    window.InformesGP.getContexto = getContexto;
  };

  form.addEventListener("input", handler);
  form.addEventListener("change", handler);

  handler();

  limpiarObservadorActual = () => {
    form.removeEventListener("input", handler);
    form.removeEventListener("change", handler);
  };
}

export function leerCamposInformeEspecial(root = document) {
  const form = root.querySelector(".formulario-informe-especial");
  if (!form) return null;

  const datos = {};
  const campos = form.querySelectorAll("input, textarea, select");

  for (const campo of campos) {
    if (campo.type === "file") continue;

    const nombre = campo.name || campo.id;
    if (!nombre) continue;

    if (campo.type === "checkbox") {
      datos[nombre] = Boolean(campo.checked);
      continue;
    }

    if (campo.type === "number") {
      datos[nombre] = normalizarNumero(campo.value);
      continue;
    }

    datos[nombre] = String(campo.value || "").trim();
  }

  datos.modelo = form.dataset.modelo || "";
  datos.fotos_prefijo = form.dataset.fotosPrefijo || "";
  datos.fotos = obtenerResumenFotos(datos.fotos_prefijo);

  return datos;
}

function normalizarNumero(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  return n;
}

function obtenerResumenFotos(prefijo) {
  if (!prefijo) return [];

  const fotos = window.InformesGP?.fotos?.[prefijo] || [];

  if (!Array.isArray(fotos)) {
    return [];
  }

  return fotos.map((foto) => ({
    indice: foto.indice,
    nombre: foto.nombre
  }));
}
