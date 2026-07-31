import {
  obtenerEstadoInformes,
  establecerEstadoInformes,
  sincronizarWindowInformesGP,
  tomarEstadoDesdeWindowInformesGP
} from "./informes-state.js";

export function iniciarCoordinadorInformes() {
  window.InformesGP = window.InformesGP || {};
  tomarEstadoDesdeWindowInformesGP();
  sincronizarWindowInformesGP();

  return obtenerEstadoInformes();
}

export function obtenerContextoInformes() {
  const estado = obtenerEstadoInformes();

  return {
    modo: estado.modo || "",
    guardiaFecha: estado.guardiaFecha || "",
    operativoSeleccionado: estado.operativoSeleccionado || null,
    cantidadOperativos: estado.cantidadOperativos || 0,
    operativosDisponibles: Array.isArray(estado.operativosDisponibles)
      ? estado.operativosDisponibles
      : []
  };
}

export function registrarModoActual(modo) {
  return establecerEstadoInformes({
    modo: modo || "",
    operativoSeleccionado: null
  });
}

export function registrarGuardiaFecha(guardiaFecha) {
  return establecerEstadoInformes({
    guardiaFecha: guardiaFecha || ""
  });
}

export function registrarOperativoSeleccionado(operativoSeleccionado) {
  return establecerEstadoInformes({
    operativoSeleccionado: operativoSeleccionado || null
  });
}

export function registrarOperativosDisponibles({ modo, operativos = [] }) {
  return establecerEstadoInformes({
    modo: modo || "",
    operativosDisponibles: Array.isArray(operativos) ? operativos : [],
    cantidadOperativos: Array.isArray(operativos) ? operativos.length : 0
  });
}

export function registrarInicioModulo({
  actual = null,
  errores = [],
  texto = "",
  supabasePayload = null
} = {}) {
  return establecerEstadoInformes({
    inicioActual: actual,
    inicioErrores: Array.isArray(errores) ? errores : [],
    inicioTexto: texto || "",
    inicioSupabasePayload: supabasePayload
  });
}

export function registrarFinalizadoModulo({
  actual = null,
  errores = [],
  texto = "",
  supabasePayload = null
} = {}) {
  return establecerEstadoInformes({
    finalizadoActual: actual,
    finalizadoErrores: Array.isArray(errores) ? errores : [],
    finalizadoTexto: texto || "",
    finalizadoSupabasePayload: supabasePayload
  });
}

export function registrarInformeModulo({
  actual = null,
  errores = [],
  texto = "",
  supabasePayload = null
} = {}) {
  return establecerEstadoInformes({
    informeActual: actual,
    informeErrores: Array.isArray(errores) ? errores : [],
    informeTexto: texto || "",
    informeEspecialTexto: texto || "",
    informeEspecialSupabasePayload: supabasePayload
  });
}

export function registrarControlMovilesModulo({
  actual = null,
  errores = [],
  texto = "",
  supabasePayload = null
} = {}) {
  return establecerEstadoInformes({
    controlMovilesActual: actual,
    controlMovilesErrores: Array.isArray(errores) ? errores : [],
    controlMovilesTexto: texto || "",
    controlMovilesSupabasePayload: supabasePayload
  });
}

export function registrarFotosModulo(prefijo, fotos = []) {
  const estado = obtenerEstadoInformes();
  const fotosActuales = estado.fotos || {};

  return establecerEstadoInformes({
    fotos: {
      ...fotosActuales,
      [prefijo]: Array.isArray(fotos) ? fotos : []
    }
  });
}

export function registrarNumeralesFinaliza(estadoNumerales = {}) {
  return establecerEstadoInformes({
    numeralesFinaliza: {
      items: Array.isArray(estadoNumerales.items) ? estadoNumerales.items : [],
      resumen: estadoNumerales.resumen || ""
    }
  });
}

export function registrarResultadoModulo(nombreModulo, parcial = {}) {
  const key = String(nombreModulo || "").trim().toUpperCase();

  if (key === "INICIA" || key === "INICIO") {
    return registrarInicioModulo(parcial);
  }

  if (key === "FINALIZA" || key === "FINALIZADO") {
    return registrarFinalizadoModulo(parcial);
  }

  if (key === "INFORMES" || key === "INFORME") {
    return registrarInformeModulo(parcial);
  }

  if (key === "CONTROL_MOVILES") {
    return registrarControlMovilesModulo(parcial);
  }

  return obtenerEstadoInformes();
}