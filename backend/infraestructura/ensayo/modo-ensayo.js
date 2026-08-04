/**
 * Modo de ensayo local de Informes_GP.
 * Se activa únicamente con ?ensayo=1 (se conserva ?demo=1 como alias).
 * Nunca debe alterar ni persistir datos en Supabase.
 */
export function modoEnsayoActivo(opciones = {}) {
  if (opciones.modoEnsayo === true || opciones.modoDemo === true || opciones.ensayo === true || opciones.demo === true) {
    return true;
  }

  try {
    if (window.InformesGP?.modoEnsayo === true || window.InformesGP?.modoDemo === true) {
      return true;
    }

    const params = new URLSearchParams(window.location.search);
    return parametroActivo(params.get("ensayo")) || parametroActivo(params.get("demo"));
  } catch {
    return false;
  }
}

export function registrarModoEnsayoEnWindow() {
  const activo = modoEnsayoActivo();

  try {
    window.InformesGP = window.InformesGP || {};
    window.InformesGP.modoEnsayo = activo;
  } catch {}

  return activo;
}

function parametroActivo(valor) {
  return ["1", "true", "si", "sí", "on"].includes(String(valor || "").trim().toLowerCase());
}
