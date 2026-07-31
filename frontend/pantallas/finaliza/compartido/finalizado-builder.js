import { validarFinalizadoBase } from "../../../../backend/dominio/finaliza/finalizado-validaciones-base.js";
import { construirTextoFinalizadoBase } from "../../../../backend/dominio/finaliza/finalizado-salida-texto-base.js";
import { mapearFinalizadoParaSupabase } from "../../../../backend/dominio/finaliza/finalizado-mapper-supabase.js";

export function construirFinalizadoDesdeFormulario({
  form,
  operativoSeleccionado,
  contexto = {}
} = {}) {
  const formulario = leerDatosFormularioBase(form);
  const tipoFormulario = form?.dataset?.tipoOperativo || "";
  const fotoPrefijo = form?.dataset?.fotoPrefijo || "";
  const fotos = fotoPrefijo ? (window.InformesGP?.fotos?.[fotoPrefijo] || []) : [];

  const actual = {
    modo: "FINALIZA",
    fecha: new Date().toISOString(),
    guardia_fecha: resolverGuardiaFecha({
      operativoSeleccionado,
      contexto
    }),
    operativo: operativoSeleccionado || null,
    operativo_key: operativoSeleccionado?.operativo_key || "",
    tipo_operativo: normalizarTipo(tipoFormulario || operativoSeleccionado?.tipo_operativo || "GENERICO"),
    hora_inicio: operativoSeleccionado?.hora_inicio || "",
    hora_fin: operativoSeleccionado?.hora_fin || "",
    lugar: operativoSeleccionado?.lugar || "",
    formulario,
    foto_prefijo: fotoPrefijo,
    fotos,
    numeralesFinaliza: contexto?.numeralesFinaliza || window.InformesGP?.numeralesFinaliza || {
      items: [],
      resumen: ""
    }
  };

  const errores = validarFinalizadoBase(actual);
  const texto = construirTextoFinalizadoBase(actual);
  const supabasePayload = mapearFinalizadoParaSupabase({
    ...actual,
    texto
  });

  return {
    actual,
    errores,
    texto,
    supabasePayload
  };
}

export function leerDatosFormularioBase(form) {
  const datos = {};

  if (!form) return datos;

  const formData = new FormData(form);

  for (const [clave, valor] of formData.entries()) {
    datos[clave] = limpiarValor(valor);
  }

  for (const campo of form.querySelectorAll("[name]")) {
    const nombre = campo.getAttribute("name");
    if (!nombre) continue;

    if (campo.type === "checkbox") {
      datos[nombre] = Boolean(campo.checked);
      continue;
    }

    if (campo.type === "radio") {
      if (campo.checked) {
        datos[nombre] = limpiarValor(campo.value);
      }
      continue;
    }

    if (!(nombre in datos)) {
      datos[nombre] = limpiarValor(campo.value);
    }
  }

  normalizarNumericos(datos, ["actas", "personas", "vehiculos"]);

  return datos;
}

function resolverGuardiaFecha({ operativoSeleccionado, contexto }) {
  return String(
    operativoSeleccionado?.guardia_fecha ||
    contexto?.guardia_fecha ||
    contexto?.guardiaFecha ||
    window.InformesGP?.guardiaFecha ||
    ""
  ).trim();
}

function normalizarNumericos(datos, claves) {
  for (const clave of claves) {
    const n = Number(datos[clave] || 0);
    datos[clave] = Number.isFinite(n) && n >= 0 ? n : 0;
  }
}

function limpiarValor(valor) {
  if (valor === null || valor === undefined) return "";

  if (valor instanceof File) return valor;

  return String(valor)
    .replace(/\r\n/g, "\n")
    .trim();
}

function normalizarTipo(valor) {
  return String(valor || "GENERICO")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}