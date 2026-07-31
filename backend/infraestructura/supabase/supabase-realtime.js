import {
  supabase,
  supabaseDisponible,
  TABLAS_REALTIME_INFORMES_GP
} from "./supabase-client.js";

const TABLAS_REALTIME = TABLAS_REALTIME_INFORMES_GP;

let canalPrincipal = null;
let realtimeActivo = false;
let ultimoGuardiaFecha = "";
let timeoutDebounce = null;

export function iniciarRealtimeInformesGP({
  guardia_fecha,
  onCambio
} = {}) {
  const guardiaFecha = String(
    guardia_fecha ||
    window.InformesGP?.guardiaFecha ||
    ""
  ).trim();

  if (!supabaseDisponible() || !supabase) {
    console.warn("[Informes_GP] Realtime no iniciado: Supabase no configurado.");
    return {
      activo: false,
      motivo: "Supabase no configurado."
    };
  }

  if (realtimeActivo && canalPrincipal && ultimoGuardiaFecha === guardiaFecha) {
    return {
      activo: true,
      motivo: "Realtime ya estaba activo."
    };
  }

  detenerRealtimeInformesGP();

  ultimoGuardiaFecha = guardiaFecha;

  const canalNombre = `informes_gp_realtime_${guardiaFecha || "sin_guardia"}`;

  canalPrincipal = supabase.channel(canalNombre);

  for (const tabla of TABLAS_REALTIME) {
    canalPrincipal.on(
      "postgres_changes",
      construirFiltroTabla({
        tabla,
        guardiaFecha
      }),
      (payload) => {
        manejarCambioRealtime({
          payload,
          tabla,
          guardiaFecha,
          onCambio
        });
      }
    );
  }

  canalPrincipal.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      realtimeActivo = true;
      console.log("[Informes_GP] Realtime activo:", canalNombre);
      window.dispatchEvent(new CustomEvent("informesgp:realtime-estado", {
        detail: {
          activo: true,
          status,
          guardia_fecha: guardiaFecha
        }
      }));
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      realtimeActivo = false;
      console.warn("[Informes_GP] Realtime estado:", status);
      window.dispatchEvent(new CustomEvent("informesgp:realtime-estado", {
        detail: {
          activo: false,
          status,
          guardia_fecha: guardiaFecha
        }
      }));
    }
  });

  return {
    activo: true,
    guardia_fecha: guardiaFecha,
    canal: canalNombre
  };
}

export async function detenerRealtimeInformesGP() {
  if (timeoutDebounce) {
    clearTimeout(timeoutDebounce);
    timeoutDebounce = null;
  }

  if (canalPrincipal && supabase) {
    try {
      await supabase.removeChannel(canalPrincipal);
    } catch (error) {
      console.warn("[Informes_GP] No se pudo remover canal Realtime:", error);
    }
  }

  canalPrincipal = null;
  realtimeActivo = false;
}

export function estaRealtimeInformesGPActivo() {
  return Boolean(realtimeActivo && canalPrincipal);
}

function construirFiltroTabla({
  tabla,
  guardiaFecha
}) {
  const config = {
    event: "*",
    schema: "public",
    table: tabla
  };

  if (guardiaFecha) {
    config.filter = `guardia_fecha=eq.${guardiaFecha}`;
  }

  return config;
}

function manejarCambioRealtime({
  payload,
  tabla,
  guardiaFecha,
  onCambio
}) {
  const detalle = {
    tabla,
    guardia_fecha: guardiaFecha,
    eventType: payload?.eventType || "",
    new: payload?.new || null,
    old: payload?.old || null,
    at: new Date().toISOString()
  };

  window.dispatchEvent(new CustomEvent("informesgp:supabase-cambio", {
    detail: detalle
  }));

  if (typeof onCambio !== "function") {
    return;
  }

  if (timeoutDebounce) {
    clearTimeout(timeoutDebounce);
  }

  timeoutDebounce = setTimeout(() => {
    timeoutDebounce = null;

    try {
      onCambio(detalle);
    } catch (error) {
      console.error("[Informes_GP] Error en callback Realtime:", error);
    }
  }, 350);
}
