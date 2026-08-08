const estadoInicial = {
  modo: "",
  guardiaFecha: "",
  operativoSeleccionado: null,
  operativosDisponibles: [],
  cantidadOperativos: 0,

  inicioActual: null,
  inicioErrores: [],
  inicioTexto: "",
  inicioSupabasePayload: null,

  finalizadoActual: null,
  finalizadoErrores: [],
  finalizadoTexto: "",
  finalizadoSupabasePayload: null,

  informeActual: null,
  informeErrores: [],
  informeTexto: "",
  informeEspecialSupabasePayload: null,

  controlMovilesActual: null,
  controlMovilesErrores: [],
  controlMovilesTexto: "",
  controlMovilesSupabasePayload: null,

  fotos: {},
  numeralesFinaliza: {
    items: [],
    resumen: ""
  }
};

let estado = clonar(estadoInicial);
const suscriptores = new Set();

export function obtenerEstadoInformes() {
  return clonar(estado);
}

export function obtenerValorEstadoInformes(clave) {
  return clonar(estado[clave]);
}

export function establecerEstadoInformes(parcial = {}) {
  estado = {
    ...estado,
    ...clonar(parcial)
  };

  notificarSuscriptores();

  return obtenerEstadoInformes();
}

export function actualizarEstadoInformes(mutador) {
  if (typeof mutador !== "function") {
    return obtenerEstadoInformes();
  }

  const copia = obtenerEstadoInformes();
  const parcial = mutador(copia) || {};

  return establecerEstadoInformes(parcial);
}

export function limpiarEstadoInformes() {
  estado = clonar(estadoInicial);
  notificarSuscriptores();
  return obtenerEstadoInformes();
}

export function suscribirEstadoInformes(callback) {
  if (typeof callback !== "function") {
    return () => {};
  }

  suscriptores.add(callback);

  return () => {
    suscriptores.delete(callback);
  };
}

function notificarSuscriptores() {
  const copia = obtenerEstadoInformes();

  for (const callback of suscriptores) {
    try {
      callback(copia);
    } catch (error) {
      console.warn("[Informes_GP] Error en suscriptor de estado:", error);
    }
  }
}

function clonar(valor) {
  if (valor === null || valor === undefined) {
    return valor;
  }

  try {
    return JSON.parse(JSON.stringify(valor));
  } catch {
    return valor;
  }
}