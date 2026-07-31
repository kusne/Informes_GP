export async function renderDiagnosticoSupabase({
  hostSelector = "#diagnosticoSupabaseHost"
} = {}) {
  const host = document.querySelector(hostSelector);

  if (host) {
    host.innerHTML = "";
    host.style.display = "none";
  }

  return {
    visible: false,
    mensaje: "Diagnóstico Supabase oculto en Pantalla Principal."
  };
}

export async function actualizarDiagnosticoSupabase() {
  const host = document.querySelector("#diagnosticoSupabaseHost");

  if (host) {
    host.innerHTML = "";
    host.style.display = "none";
  }

  return {
    visible: false,
    mensaje: "Diagnóstico Supabase oculto en Pantalla Principal."
  };
}