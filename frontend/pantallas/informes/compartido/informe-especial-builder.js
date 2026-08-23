import {
  procesarInformeEspecialFormulario,
  registrarInformeModulo
} from "../../../../api/app-api.js";
import { cargarFotosDeFormulario } from "../../../servicios/fotos/fotos-formulario-loader.js";

export async function iniciarModeloInformeEspecial({
  form,
  modelo,
  operativoSeleccionado,
  getOperativoSeleccionado,
  getContexto
} = {}) {
  if (!form) {
    registrarInformeModulo({
      actual: null,
      errores: ["No se encontró el formulario del informe especial."],
      texto: "",
      supabasePayload: null
    });
    return;
  }

  const resolverOperativoActual = () => {
    if (typeof getOperativoSeleccionado === "function") {
      try {
        return getOperativoSeleccionado() || null;
      } catch {
        return operativoSeleccionado || null;
      }
    }
    return operativoSeleccionado || null;
  };

  autocompletarDesdeOperativo(form, resolverOperativoActual());

  await cargarFotosDeFormulario({
    form,
    contexto: {
      ...resolverContexto(getContexto),
      operativoSeleccionado: resolverOperativoActual()
    }
  });

  const actualizar = () => {
    const resultado = procesarInformeEspecialFormulario({
      formulario: leerDatosFormulario(form),
      modelo: modelo || form?.dataset?.modeloInforme || "",
      fotoPrefijo: form?.dataset?.fotoPrefijo || "",
      operativoSeleccionado: resolverOperativoActual(),
      contexto: resolverContexto(getContexto)
    });

    registrarInformeModulo({
      actual: resultado.actual,
      errores: resultado.errores,
      texto: resultado.texto,
      supabasePayload: resultado.supabasePayload
    });
  };

  form.addEventListener("input", actualizar);
  form.addEventListener("change", actualizar);
  form.addEventListener("keyup", actualizar);
  form.addEventListener("paste", () => setTimeout(actualizar, 0));
  form.addEventListener("informesgp:operativo-informe-actualizado", actualizar);
  actualizar();
}

export function actualizarOperativoInformeEspecial({
  form,
  operativoSeleccionado
} = {}) {
  if (!form) return;

  autocompletarDesdeOperativo(form, operativoSeleccionado);
  form.dispatchEvent(new CustomEvent("informesgp:operativo-informe-actualizado"));
}

export function leerDatosFormulario(form) {
  const datos = {};
  if (!form) return datos;

  for (const campo of form.querySelectorAll("[name]")) {
    const nombre = campo.getAttribute("name");
    if (!nombre) continue;
    if (campo.type === "checkbox") {
      datos[nombre] = Boolean(campo.checked);
      continue;
    }
    if (campo.type === "radio") {
      if (campo.checked) datos[nombre] = limpiarValor(campo.value);
      continue;
    }
    datos[nombre] = limpiarValor(campo.value);
  }
  return datos;
}

function autocompletarDesdeOperativo(form, operativo = {}) {
  if (!form || !operativo) return;
  const datos = operativo?.datos && typeof operativo.datos === "object" ? operativo.datos : {};
  const fecha = fechaOperativoISO(operativo);
  const lugar = primerValor(operativo.lugar, operativo.qth, operativo.ubicacion, datos.lugar, datos.qth, datos.ubicacion);
  const personal = primerValor(operativo.personal, datos.personal, datos.personal_policial);
  const moviles = primerValor(operativo.moviles_motos, datos.moviles_motos, datos.moviles, datos.movilidad);

  completarCampoSiVacio(form, ["fecha_hecho", "fecha_operativo", "fecha"], fecha);
  completarCampoSiVacio(form, ["lugar_hecho", "lugar"], lugar);
  completarCampoSiVacio(form, ["personal", "personal_policial"], personal);
  completarCampoSiVacio(form, ["moviles", "moviles_motos", "movilidad"], moviles);
}

function completarCampoSiVacio(form, nombres, valor) {
  if (!valor) return;
  for (const nombre of nombres) {
    const campo = form.querySelector(`[name="${nombre}"]`);
    if (!campo) continue;

    const esContextoOculto =
      campo.type === "hidden" &&
      campo.hasAttribute("data-contexto-operativo");

    if (!esContextoOculto && String(campo.value || "").trim()) continue;

    campo.value = String(valor).trim();
    break;
  }
}

function fechaOperativoISO(operativo = {}) {
  const valor = primerValor(operativo.fecha_operativo, operativo.guardia_fecha, operativo.fecha);
  const match = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function primerValor(...valores) {
  for (const valor of valores) {
    const limpio = String(valor ?? "").trim();
    if (limpio) return limpio;
  }
  return "";
}

function resolverContexto(getContexto) {
  if (typeof getContexto !== "function") return {};
  try { return getContexto() || {}; } catch { return {}; }
}

function limpiarValor(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor).replace(/\r\n/g, "\n").trim();
}
