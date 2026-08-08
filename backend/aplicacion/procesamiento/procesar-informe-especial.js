import { validarInformeEspecial } from "../../dominio/informes/informe-especial-validaciones.js";
import { construirTextoInformeEspecial } from "../../dominio/informes/informe-especial-salida-texto.js";
import { mapearInformeEspecialParaSupabase } from "../../dominio/informes/informe-especial-mapper-supabase.js";
import {
  construirNumeralesSugeridosInforme,
  construirIncrementosSugeridosInforme
} from "../../dominio/informes/informe-especial-reglas-numerales.js";
import { obtenerFotosPorPrefijo } from "../estado/fotos-estado.js";
import { obtenerEstadoInformes } from "../estado/informes-state.js";

export function procesarInformeEspecialFormulario({
  formulario = {},
  modelo = "",
  fotoPrefijo = "",
  operativoSeleccionado = null,
  contexto = {}
} = {}) {
  const modeloNormalizado = normalizarModelo(modelo);
  const ahora = new Date();
  const estado = obtenerEstadoInformes();

  const base = {
    modo: "INFORMES",
    modelo: modeloNormalizado,
    fecha: ahora.toISOString(),
    fecha_informe: formatearFechaLocalISO(ahora),
    hora_informe: formatearHoraLocal(ahora),
    guardia_fecha: String(
      operativoSeleccionado?.guardia_fecha ||
      contexto?.guardia_fecha ||
      contexto?.guardiaFecha ||
      estado?.guardiaFecha ||
      ""
    ).trim(),
    operativo: operativoSeleccionado || null,
    operativo_key: operativoSeleccionado?.operativo_key || "",
    tipo_operativo: normalizarTipo(operativoSeleccionado?.tipo_operativo || "GENERICO"),
    hora_inicio: operativoSeleccionado?.hora_inicio || "",
    hora_fin: operativoSeleccionado?.hora_fin || "",
    lugar: operativoSeleccionado?.lugar || "",
    formulario: { ...(formulario || {}) },
    foto_prefijo: fotoPrefijo || "",
    fotos: fotoPrefijo ? obtenerFotosPorPrefijo(fotoPrefijo) : [],
    calculos: calcularDatosModelo(modeloNormalizado, formulario || {})
  };

  const numeralesSugeridos = construirNumeralesSugeridosInforme(base);
  const incrementosSugeridos = construirIncrementosSugeridosInforme(base);
  const actual = {
    ...base,
    numerales_sugeridos: numeralesSugeridos,
    incrementos_sugeridos: incrementosSugeridos,
    calculos: {
      ...base.calculos,
      incrementos_sugeridos: incrementosSugeridos,
      numerales_sugeridos: numeralesSugeridos
    }
  };

  const errores = validarInformeEspecial(actual);
  const texto = construirTextoInformeEspecial(actual);
  const supabasePayload = mapearInformeEspecialParaSupabase({ ...actual, texto });

  return { actual, errores, texto, supabasePayload };
}

function calcularDatosModelo(modelo, formulario) {
  if (modelo === "ALCOHOLEMIA_POSITIVA") {
    const tipoVehiculo = normalizarTipoVehiculo(formulario.tipo_vehiculo);
    const resultado = Number(formulario.resultado || 0);
    const limite = resolverLimiteAlcoholemia(tipoVehiculo);
    return {
      tipo_vehiculo_normalizado: tipoVehiculo,
      resultado,
      limite,
      sancionable: Number.isFinite(resultado) && resultado > limite,
      codigo_sancionable: resolverCodigoSancionable(tipoVehiculo),
      licencia_digital: Boolean(formulario.licencia_digital),
      con_decreto_460_22: Boolean(formulario.con_decreto_460_22)
    };
  }
  if (modelo === "DECRETO_460_22") {
    return { procedimiento_460_22: true, tipo_vehiculo: "MOTOVEHÍCULO", codigos_infraccion: String(formulario.codigos_infraccion || "").trim() };
  }
  if (modelo === "CONTROL_ARMAS") {
    return { control_armas: true, cantidad_armas: Number(formulario.cantidad_armas || 0) };
  }
  if (modelo === "RETENCION_LICENCIA") {
    return { retencion_licencia: true, motivo_licencia: formulario.motivo_licencia || "", codigo: formulario.codigo || resolverCodigoLicencia(formulario.motivo_licencia) };
  }
  return {};
}

function resolverCodigoLicencia(motivo) {
  const key = String(motivo || "").trim().toUpperCase();
  if (key === "VENCIDA_MAS_6_MESES") return "9136";
  if (key === "VENCIDA_MENOS_6_MESES") return "9123";
  if (key === "CADUCA_CAMBIO_DATOS") return "9140";
  if (key === "MAL_OTORGADA") return "9153";
  return "";
}
function resolverLimiteAlcoholemia(tipo) {
  if (tipo === "MOTO") return 0.20;
  if (["TRANSPORTE", "CAMION", "CHASIS", "TRACTOR", "CARRETON"].includes(tipo)) return 0;
  return 0.50;
}
function resolverCodigoSancionable(tipo) {
  if (tipo === "MOTO") return "2020";
  if (["TRANSPORTE", "CAMION", "CHASIS", "TRACTOR", "CARRETON"].includes(tipo)) return "2033";
  return "2016";
}
function normalizarTipoVehiculo(valor) {
  const texto = normalizarTexto(valor);
  if (texto.includes("MOTO")) return "MOTO";
  if (texto.includes("TRANSPORTE")) return "TRANSPORTE";
  if (texto.includes("CAMION")) return "CAMION";
  if (texto.includes("CHASIS")) return "CHASIS";
  if (texto.includes("TRACTOR")) return "TRACTOR";
  if (texto.includes("CARRETON")) return "CARRETON";
  if (texto.includes("CAMIONETA") || texto.includes("PICK")) return "CAMIONETA";
  return texto || "";
}
function normalizarModelo(valor) { return String(valor || "").trim().toUpperCase().replaceAll("-", "_").replace(/\s+/g, "_"); }
function normalizarTipo(valor) { return String(valor || "GENERICO").trim().toUpperCase().replaceAll("-", "_").replace(/\s+/g, "_"); }
function normalizarTexto(valor) { return String(valor || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function formatearFechaLocalISO(fecha) { return `${fecha.getFullYear()}-${pad2(fecha.getMonth() + 1)}-${pad2(fecha.getDate())}`; }
function formatearHoraLocal(fecha) { return `${pad2(fecha.getHours())}:${pad2(fecha.getMinutes())}`; }
function pad2(valor) { return String(valor).padStart(2, "0"); }
