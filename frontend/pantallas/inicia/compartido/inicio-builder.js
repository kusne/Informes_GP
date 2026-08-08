import { procesarInicioFormulario } from "../../../../api/app-api.js";

export function construirInicioDesdeFormulario({
  form,
  operativoSeleccionado,
  contexto = {}
} = {}) {
  return procesarInicioFormulario({
    formulario: leerDatosFormularioBase(form),
    tipoFormulario: form?.dataset?.tipoOperativo || "",
    fotoPrefijo: form?.dataset?.fotoPrefijo || "",
    operativoSeleccionado,
    contexto
  });
}

export function leerDatosFormularioBase(form) {
  const datos = {};
  if (!form) return datos;

  if (typeof HTMLFormElement !== "undefined" && form instanceof HTMLFormElement) {
    const formData = new FormData(form);
    for (const [clave, valor] of formData.entries()) datos[clave] = limpiarValor(valor);
  }

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
    if (!(nombre in datos)) datos[nombre] = limpiarValor(campo.value);
  }

  return datos;
}

function limpiarValor(valor) {
  if (valor === null || valor === undefined) return "";
  if (typeof File !== "undefined" && valor instanceof File) return valor;
  return String(valor).replace(/\r\n/g, "\n").trim();
}
