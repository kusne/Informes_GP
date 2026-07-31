const contextoOperativos = {
  guardiaFecha: null,
  ultimoModo: "",
  ultimaFuente: "DEMO"
};

export function configurarContextoOperativos(parcial = {}) {
  Object.assign(contextoOperativos, parcial || {});
  return obtenerContextoOperativos();
}

export function obtenerContextoOperativos() {
  return { ...contextoOperativos };
}

export function establecerGuardiaFechaOperativos(guardiaFecha) {
  contextoOperativos.guardiaFecha = guardiaFecha || null;
  return obtenerContextoOperativos();
}

export function registrarFuenteOperativos({ modo, fuente }) {
  contextoOperativos.ultimoModo = modo || "";
  contextoOperativos.ultimaFuente = fuente || "DEMO";
}
