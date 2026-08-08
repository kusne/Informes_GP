import { validarInicioBase } from "../../dominio/inicia/inicio-validaciones-base.js";
import { construirTextoInicioBase } from "../../dominio/inicia/inicio-salida-texto-base.js";
import { mapearInicioParaSupabase } from "../../dominio/inicia/inicio-mapper-supabase.js";
import { usaElementosOpcionalesInicio } from "../../dominio/compartido/tipos/operativos-elementos-controlados-opcionales.js";
import { obtenerFotosPorPrefijo } from "../estado/fotos-estado.js";
import { obtenerEstadoInformes } from "../estado/informes-state.js";

export function procesarInicioFormulario({
  formulario = {},
  tipoFormulario = "",
  fotoPrefijo = "",
  operativoSeleccionado = null,
  contexto = {}
} = {}) {
  const datosFormulario = { ...(formulario || {}) };

  if (usaElementosOpcionalesInicio(operativoSeleccionado, tipoFormulario) && !datosFormulario.agregar_elementos) {
    datosFormulario.elementos = "";
  }

  const actual = {
    modo: "INICIA",
    fecha: new Date().toISOString(),
    fecha_operativo: resolverFechaOperativo({ operativoSeleccionado, contexto }),
    guardia_fecha: resolverGuardiaFecha({ operativoSeleccionado, contexto }),
    operativo: operativoSeleccionado || null,
    operativo_key: operativoSeleccionado?.operativo_key || "",
    tipo_operativo: normalizarTipo(tipoFormulario || operativoSeleccionado?.tipo_operativo || "GENERICO"),
    hora_inicio: operativoSeleccionado?.hora_inicio || "",
    hora_fin: operativoSeleccionado?.hora_fin || "",
    lugar: operativoSeleccionado?.lugar || "",
    formulario: datosFormulario,
    foto_prefijo: fotoPrefijo || "",
    fotos: fotoPrefijo ? obtenerFotosPorPrefijo(fotoPrefijo) : []
  };

  const errores = validarInicioBase(actual);
  const texto = construirTextoInicioBase(actual);
  const supabasePayload = mapearInicioParaSupabase({ ...actual, texto });

  return { actual, errores, texto, supabasePayload };
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
  const estado = obtenerEstadoInformes();
  return String(
    operativoSeleccionado?.guardia_fecha ||
    contexto?.guardia_fecha ||
    contexto?.guardiaFecha ||
    estado?.guardiaFecha ||
    ""
  ).trim();
}

function normalizarTipo(valor) {
  return String(valor || "GENERICO").trim().toUpperCase().replaceAll("-", "_").replace(/\s+/g, "_");
}
