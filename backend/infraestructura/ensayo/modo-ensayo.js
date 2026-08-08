/** Modo de ensayo independiente del navegador. */
let modoEnsayoConfigurado = false;

export function configurarModoEnsayo(activo = false) {
  modoEnsayoConfigurado = Boolean(activo);
  return modoEnsayoConfigurado;
}

export function modoEnsayoActivo(opciones = {}) {
  if (opciones.modoEnsayo === true || opciones.modoDemo === true || opciones.ensayo === true || opciones.demo === true) {
    return true;
  }
  return modoEnsayoConfigurado;
}
