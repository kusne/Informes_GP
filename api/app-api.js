/**
 * Frontera pública entre Frontend y Backend.
 *
 * REGLA DE ARQUITECTURA:
 * - frontend/ puede importar api/
 * - api/ puede importar backend/
 * - frontend/ NO puede importar backend/
 * - backend/ NO puede depender de DOM/window ni de frontend/
 */

// Estado y coordinación de aplicación
export {
  obtenerEstadoInformes,
  obtenerValorEstadoInformes,
  establecerEstadoInformes,
  actualizarEstadoInformes,
  limpiarEstadoInformes,
  suscribirEstadoInformes
} from "../backend/aplicacion/estado/informes-state.js";

export {
  iniciarCoordinadorInformes,
  obtenerContextoInformes,
  registrarModoActual,
  registrarGuardiaFecha,
  registrarOperativoSeleccionado,
  registrarOperativosDisponibles,
  registrarInicioModulo,
  registrarFinalizadoModulo,
  registrarInformeModulo,
  registrarControlMovilesModulo,
  registrarFotosModulo,
  registrarNumeralesFinaliza,
  registrarResultadoModulo
} from "../backend/aplicacion/estado/informes-coordinador.js";

import {
  obtenerFotosPorPrefijo as obtenerFotosBackend,
  limpiarFotosPorPrefijo as limpiarFotosBackend,
  limpiarFotosPorModoPayload as limpiarFotosPorModoBackend,
  limpiarTodasLasFotosMemoria as limpiarTodasFotosBackend,
  resolverPrefijoFotoPorModoPayload
} from "../backend/aplicacion/estado/fotos-estado.js";
import { obtenerEstadoInformes } from "../backend/aplicacion/estado/informes-state.js";

export { resolverPrefijoFotoPorModoPayload };

export function obtenerFotosPorPrefijo(prefijo) {
  return obtenerFotosBackend(prefijo);
}

export function limpiarFotosPorPrefijo(prefijo) {
  revocarUrlsTemporales(obtenerFotosBackend(prefijo));
  return limpiarFotosBackend(prefijo);
}

export function limpiarFotosPorModoPayload({ modo, payload } = {}) {
  const prefijo = resolverPrefijoFotoPorModoPayload({ modo, payload });
  limpiarFotosPorPrefijo(prefijo);
  return prefijo;
}

export function limpiarTodasLasFotosMemoria() {
  const fotos = obtenerEstadoInformes()?.fotos || {};
  Object.values(fotos).forEach(revocarUrlsTemporales);
  return limpiarTodasFotosBackend();
}

export function obtenerGuardiaFechaActual() {
  return String(obtenerEstadoInformes()?.guardiaFecha || "").trim();
}

export function obtenerNumeralesFinalizaActuales() {
  return obtenerEstadoInformes()?.numeralesFinaliza || { items: [], resumen: "" };
}

function revocarUrlsTemporales(fotos = []) {
  if (!Array.isArray(fotos)) return;
  for (const foto of fotos) {
    if (!foto?.urlTemporal) continue;
    try {
      URL.revokeObjectURL(foto.urlTemporal);
    } catch {}
  }
}

// Operativos y contexto
export {
  obtenerOperativosPorModo,
  filtrarOperativosIniciadosParaFinalizar,
  seleccionarUltimosOperativosIniciados,
  filtrarProgramadosPendientes,
  obtenerOperativosDemoPorModo,
  enriquecerFechaOperativoDesdeProgramacion,
  formatearOperativoParaSelector,
  normalizarOperativos
} from "../backend/aplicacion/operativos/operativos.js";

export {
  configurarContextoOperativos,
  obtenerContextoOperativos,
  establecerGuardiaFechaOperativos,
  registrarFuenteOperativos
} from "../backend/aplicacion/operativos/operativos-contexto.js";

export { obtenerGuardiaFecha0600 } from "../backend/dominio/compartido/fechas/guardia-0600.js";

// Servicios de referencia INICIA
export {
  obtenerCatalogoRecursosInicio,
  construirResumenRecursosInicio
} from "../backend/dominio/inicia/recursos-inicio.js";

// Servicios de referencia FINALIZA
export {
  resolverRecursosInicioParaFinaliza
} from "../backend/dominio/finaliza/recursos-finaliza.js";
export {
  buscarNumeralPorCodigo,
  normalizarCodigo
} from "../backend/dominio/finaliza/numerales/numerales-finaliza-data.js";
export { extraerItemsNumerales } from "../backend/dominio/finaliza/numerales/normalizador-numerales.js";
export { consolidarItemsNumerales } from "../backend/dominio/finaliza/numerales/contador-numerales.js";
export { clasificarItemsNumerales } from "../backend/dominio/finaliza/numerales/clasificador-numerales.js";
export {
  NOMENCLADOR_CODIGOS,
  normalizeCodigoFalta,
  getNomencladorFalta,
  getReferenciaFalta,
  extraerCodigosFalta
} from "../backend/dominio/finaliza/numerales/nomenclador.js";

// Dominio compartido
export {
  usaElementosOpcionalesInicio,
  usaControladosOpcionalesFinaliza,
  hayControladosFinaliza,
  CAMPOS_CONTROLADOS,
  resolverHoraFinFinalizadoEspecial
} from "../backend/dominio/compartido/tipos/operativos-elementos-controlados-opcionales.js";
export { esOperativoPatrullaje } from "../backend/dominio/compartido/tipos/patrullaje.js";
export { usaResultadosAssalControlArmas } from "../backend/dominio/compartido/tipos/resultados-especiales-finaliza.js";
export {
  obtenerCatalogoRecursosOperativos,
  construirResumenRecursosOperativos
} from "../backend/dominio/compartido/recursos/catalogo-recursos-operativos.js";

// INFORMES se procesan únicamente mediante procesarInformeEspecialFormulario.

// Fotos: validación pura + adaptador de contexto para nombre
export { validarFotoArchivo, validarCantidadFotos } from "../backend/dominio/compartido/fotos/validar-foto.js";
import { normalizarNombreFoto as normalizarNombreFotoBackend } from "../backend/dominio/compartido/fotos/normalizar-nombre-foto.js";
export function normalizarNombreFoto(opciones = {}) {
  const estado = obtenerEstadoInformes();
  return normalizarNombreFotoBackend({
    ...opciones,
    contexto: {
      guardia_fecha: estado?.guardiaFecha || "",
      operativoSeleccionado: estado?.operativoSeleccionado || null,
      ...(opciones?.contexto || {})
    }
  });
}

// WhatsApp: formatters puros
export { obtenerSalidaInicioDesdeEstado } from "../backend/dominio/whatsapp/formateador-inicio.js";
export { obtenerSalidaFinalizadoDesdeEstado } from "../backend/dominio/whatsapp/formateador-finalizado.js";
export { obtenerSalidaInformesDesdeEstado } from "../backend/dominio/whatsapp/formateador-informes.js";
export { obtenerSalidaControlMovilesDesdeEstado } from "../backend/dominio/whatsapp/formateador-control-moviles.js";
export { contarFotosCargadasDesdeEstado } from "../backend/dominio/whatsapp/fotos-whatsapp.js";
export { WHATSAPP_CONFIG, normalizarTelefonoWhatsapp } from "../backend/dominio/whatsapp/whatsapp-config.js";
import { obtenerTelefonoWhatsappDestino as obtenerTelefonoBackend } from "../backend/dominio/whatsapp/whatsapp-config.js";
export function obtenerTelefonoWhatsappDestino() {
  const valor =
    globalThis?.InformesGP?.whatsapp?.telefonoDestino ||
    globalThis?.WHATSAPP_TELEFONO_DESTINO ||
    "";
  return obtenerTelefonoBackend(valor);
}

// Modo ensayo: el backend solo conoce un flag y un adaptador de storage.
import {
  configurarModoEnsayo,
  modoEnsayoActivo as modoEnsayoBackend
} from "../backend/infraestructura/ensayo/modo-ensayo.js";
import { configurarStorageEnsayo } from "../backend/infraestructura/ensayo/operativos-ensayo.js";

export function inicializarEntornoAplicacion() {
  const activo = detectarModoEnsayoNavegador();
  configurarModoEnsayo(activo);
  configurarStorageEnsayo(crearAdaptadorStorageNavegador());
  return { modoEnsayo: activo };
}

export function modoEnsayoActivo(opciones = {}) {
  return modoEnsayoBackend(opciones);
}

function detectarModoEnsayoNavegador() {
  try {
    const params = new URLSearchParams(globalThis?.location?.search || "");
    return parametroActivo(params.get("ensayo")) || parametroActivo(params.get("demo"));
  } catch {
    return false;
  }
}

function parametroActivo(valor) {
  return ["1", "true", "si", "sí", "on"].includes(String(valor || "").trim().toLowerCase());
}

function crearAdaptadorStorageNavegador() {
  try {
    const storage = globalThis?.localStorage;
    if (!storage) return null;
    return {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => storage.setItem(key, value),
      removeItem: (key) => storage.removeItem(key)
    };
  } catch {
    return null;
  }
}

// Casos de uso de procesamiento: frontend entrega datos de formulario planos;
// backend construye, normaliza, valida, genera texto y prepara persistencia.
export { procesarInicioFormulario } from "../backend/aplicacion/procesamiento/procesar-inicio.js";
export { procesarFinalizadoFormulario } from "../backend/aplicacion/procesamiento/procesar-finalizado.js";
export { procesarInformeEspecialFormulario } from "../backend/aplicacion/procesamiento/procesar-informe-especial.js";
