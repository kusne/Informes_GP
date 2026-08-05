import { validarFinalizadoBase } from "../../../../backend/dominio/finaliza/finalizado-validaciones-base.js";
import { construirTextoFinalizadoBase } from "../../../../backend/dominio/finaliza/finalizado-salida-texto-base.js";
import { mapearFinalizadoParaSupabase } from "../../../../backend/dominio/finaliza/finalizado-mapper-supabase.js";
import {
  usaControladosOpcionalesFinaliza,
  hayControladosFinaliza,
  CAMPOS_CONTROLADOS,
  resolverHoraFinFinalizadoEspecial
} from "../../../../backend/dominio/compartido/tipos/operativos-elementos-controlados-opcionales.js";

export function construirFinalizadoDesdeFormulario({
  form,
  operativoSeleccionado,
  contexto = {}
} = {}) {
  const formulario = leerDatosFormularioBase(form);
  const tipoFormulario = form?.dataset?.tipoOperativo || "";

  if (usaControladosOpcionalesFinaliza(operativoSeleccionado, tipoFormulario)) {
    const agregarControlados = Boolean(formulario.agregar_controlados);
    const conControlados = agregarControlados && hayControladosFinaliza(formulario);

    if (!conControlados) {
      // Si el check está destildado o todos los controlados son cero,
      // El tipo especial se finaliza sin bloque Resultados/Detalles.
      for (const campo of CAMPOS_CONTROLADOS) formulario[campo] = 0;
      formulario.graduaciones_sancionable = [];
      formulario.graduaciones_no_sancionable = [];
      formulario.qrz_documentos = [];
      formulario.dominio_items = [];
      formulario.detalles = "";
      formulario.ver_items = false;
    }
  }
  const fotoPrefijo = form?.dataset?.fotoPrefijo || "";
  const fotos = fotoPrefijo ? (window.InformesGP?.fotos?.[fotoPrefijo] || []) : [];

  const actual = {
    modo: "FINALIZA",
    // fecha conserva el momento real de generación/envío.
    // fecha_operativo es la fecha programada del operativo leída desde Supabase.
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
    hora_fin: resolverHoraFinFinalizadoEspecial(operativoSeleccionado, tipoFormulario),
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

  normalizarNumericos(datos, ["actas", "personas", "vehiculos", "test_alometro", "test_alcoholimetro", "positiva_sancionable", "positiva_no_sancionable", "assal", "control_armas", "requisas", "qrz", "dominio", "remision", "retencion", "prohibicion_circulacion", "cesion_conduccion"]);
  normalizarEnteroNoNegativo(datos, "decreto_460_22");
  normalizarJsonArrays(datos, ["graduaciones_sancionable", "graduaciones_no_sancionable", "qrz_documentos", "dominio_items"]);

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

function normalizarNumericos(datos, claves) {
  for (const clave of claves) {
    const n = Number(datos[clave] || 0);
    datos[clave] = Number.isFinite(n) && n >= 0 ? n : 0;
  }
}

function normalizarEnteroNoNegativo(datos, clave) {
  const n = Number(datos[clave] || 0);
  datos[clave] = Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

function normalizarJsonArrays(datos, claves) {
  for (const clave of claves) {
    const valor = datos[clave];
    if (Array.isArray(valor)) continue;
    try {
      const parsed = JSON.parse(String(valor || "[]"));
      datos[clave] = Array.isArray(parsed) ? parsed.map((v) => String(v || "").trim()) : [];
    } catch {
      datos[clave] = [];
    }
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