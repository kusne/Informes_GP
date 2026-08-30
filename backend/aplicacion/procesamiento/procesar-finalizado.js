import { validarFinalizadoBase } from "../../dominio/finaliza/finalizado-validaciones-base.js";
import { construirTextoFinalizadoBase } from "../../dominio/finaliza/finalizado-salida-texto-base.js";
import { mapearFinalizadoParaSupabase } from "../../dominio/finaliza/finalizado-mapper-supabase.js";
import {
  usaControladosOpcionalesFinaliza,
  hayControladosFinaliza,
  CAMPOS_CONTROLADOS,
  resolverHoraFinFinalizadoEspecial
} from "../../dominio/compartido/tipos/operativos-elementos-controlados-opcionales.js";
import { obtenerEstadoInformes } from "../estado/informes-state.js";

export function procesarFinalizadoFormulario({
  formulario = {},
  tipoFormulario = "",
  fotoPrefijo = "",
  operativoSeleccionado = null,
  contexto = {}
} = {}) {
  const datosFormulario = normalizarFormularioFinalizado(formulario);

  if (usaControladosOpcionalesFinaliza(operativoSeleccionado, tipoFormulario)) {
    const agregarControlados = Boolean(datosFormulario.agregar_controlados);
    const conControlados = agregarControlados && hayControladosFinaliza(datosFormulario);
    if (!conControlados) {
      for (const campo of CAMPOS_CONTROLADOS) datosFormulario[campo] = 0;
      datosFormulario.graduaciones_sancionable = [];
      datosFormulario.graduaciones_no_sancionable = [];
      datosFormulario.qrz_documentos = [];
      datosFormulario.dominio_items = [];
      datosFormulario.detalles = "";
      datosFormulario.ver_items = false;
    }
  }

  const estado = obtenerEstadoInformes();
  const actual = {
    modo: "FINALIZA",
    fecha: new Date().toISOString(),
    fecha_operativo: resolverFechaOperativo({ operativoSeleccionado, contexto }),
    guardia_fecha: resolverGuardiaFecha({ operativoSeleccionado, contexto, estado }),
    operativo: operativoSeleccionado || null,
    operativo_key: operativoSeleccionado?.operativo_key || "",
    tipo_operativo: normalizarTipo(tipoFormulario || operativoSeleccionado?.tipo_operativo || "GENERICO"),
    hora_inicio: operativoSeleccionado?.hora_inicio || "",
    hora_fin: resolverHoraFinFinalizadoEspecial(operativoSeleccionado, tipoFormulario),
    lugar: operativoSeleccionado?.lugar || "",
    formulario: datosFormulario,
    foto_prefijo: "",
    fotos: [],
    numeralesFinaliza: contexto?.numeralesFinaliza || estado?.numeralesFinaliza || { items: [], resumen: "" }
  };

  const errores = validarFinalizadoBase(actual);
  const texto = construirTextoFinalizadoBase(actual);
  const supabasePayload = mapearFinalizadoParaSupabase({ ...actual, texto });

  return { actual, errores, texto, supabasePayload };
}

function normalizarFormularioFinalizado(formulario) {
  const datos = { ...(formulario || {}) };
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

function resolverGuardiaFecha({ operativoSeleccionado, contexto, estado }) {
  return String(
    operativoSeleccionado?.guardia_fecha ||
    contexto?.guardia_fecha ||
    contexto?.guardiaFecha ||
    estado?.guardiaFecha ||
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

function normalizarTipo(valor) {
  return String(valor || "GENERICO").trim().toUpperCase().replaceAll("-", "_").replace(/\s+/g, "_");
}
