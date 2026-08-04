import { validarInicioBase } from "../../../../backend/dominio/inicia/inicio-validaciones-base.js";
import { construirTextoInicioBase } from "../../../../backend/dominio/inicia/inicio-salida-texto-base.js";
import { mapearInicioParaSupabase } from "../../../../backend/dominio/inicia/inicio-mapper-supabase.js";
import { usaElementosOpcionalesInicio } from "../../../../backend/dominio/compartido/tipos/operativos-elementos-controlados-opcionales.js";

export function construirInicioDesdeFormulario({
  form,
  operativoSeleccionado,
  contexto = {}
} = {}) {
  const formulario = leerDatosFormularioBase(form);
  const tipoFormulario = form?.dataset?.tipoOperativo || "";

  if (usaElementosOpcionalesInicio(operativoSeleccionado, tipoFormulario) && !formulario.agregar_elementos) {
    // En los tipos configurados (Presencia Activa / Ordenamiento Vehicular) los elementos son opt-in.
    // Aunque existan selecciones residuales en el DOM, sin el check no se envían.
    formulario.elementos = "";
  }
  const fotoPrefijo = form?.dataset?.fotoPrefijo || "";
  const fotos = fotoPrefijo ? (window.InformesGP?.fotos?.[fotoPrefijo] || []) : [];

  const actual = {
    modo: "INICIA",
    // fecha conserva el momento real de generación/envío.
    // fecha_operativo es la fecha programada publicada por Filtro Órdenes en Supabase.
    fecha: new Date().toISOString(),
    fecha_operativo: resolverFechaOperativo({
      operativoSeleccionado,
      contexto
    }),
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
    fotos
  };

  const errores = validarInicioBase(actual);
  const texto = construirTextoInicioBase(actual);
  const supabasePayload = mapearInicioParaSupabase({
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

  // FormData solo acepta HTMLFormElement. Se conserva lectura manual como
  // respaldo para componentes antiguos cuyo contenedor todavía sea una sección.
  if (typeof HTMLFormElement !== "undefined" && form instanceof HTMLFormElement) {
    const formData = new FormData(form);

    for (const [clave, valor] of formData.entries()) {
      datos[clave] = limpiarValor(valor);
    }
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

  return datos;
}

function resolverFechaOperativo({ operativoSeleccionado, contexto }) {
  return String(
    operativoSeleccionado?.fecha_operativo ||
    operativoSeleccionado?.datos?.fecha_operativo ||
    contexto?.fecha_operativo ||
    ""
  ).trim();
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