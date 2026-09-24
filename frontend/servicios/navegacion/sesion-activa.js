/**
 * Exclusividad entre Chrome y la PWA de Informes GP (mismo origen/perfil).
 * La ventana abierta/retomada más recientemente sigue operativa; las demás
 * quedan inactivas SIN destruir los formularios ni intentar window.close()
 * (Android no permite cerrar de forma fiable una pestaña abierta por el usuario).
 */
const CANAL = "informes-gp-sesion-activa-v4";
const CLAVE = "informes-gp-sesion-activa-v4";
const TIPO = "IGP_TOMAR_SESION";
const ID_AVISO = "igpSesionAnteriorInactiva";

let iniciado = false;
let canal = null;
let id = "";
let prioridad = 0;
let prioridadObservada = 0;
let inactiva = false;
let estabaOculta = false;

export function iniciarExclusividadSesionInformesGP() {
  if (iniciado) return;
  iniciado = true;
  id = crearId();
  estabaOculta = document.visibilityState === "hidden";

  if ("BroadcastChannel" in window) {
    try {
      canal = new BroadcastChannel(CANAL);
      canal.addEventListener("message", (event) => recibirTomaDeSesion(event.data));
    } catch (error) {
      console.warn("[Informes_GP] Canal de exclusividad no disponible.", error);
    }
  }

  // Segundo canal para entornos donde BroadcastChannel no está disponible.
  window.addEventListener("storage", (event) => {
    if (event.key !== CLAVE || !event.newValue) return;
    try { recibirTomaDeSesion(JSON.parse(event.newValue)); } catch {}
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted && document.visibilityState === "visible") tomarSesion();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      estabaOculta = true;
      return;
    }
    if (estabaOculta) {
      estabaOculta = false;
      tomarSesion();
    }
  });

  window.addEventListener("focus", () => {
    // En algunos Android, al volver a la app llega focus sin visibilitychange.
    // Sólo recuperar una sesión que estaba inactiva; nunca iniciar una pelea
    // de foco entre dos ventanas que permanecen visibles.
    if (inactiva && document.visibilityState === "visible" && document.hasFocus()) {
      tomarSesion();
    }
  });

  window.addEventListener("pagehide", () => {
    try { canal?.close(); } catch {}
    canal = null;
    iniciado = false;
  }, { once: true });

  // Una ventana nueva toma prioridad aunque la anterior tenga la misma versión.
  // No hay una espera para detectar duplicados: el formulario nuevo abre normal.
  if (document.visibilityState !== "hidden") tomarSesion();
}

function tomarSesion() {
  if (!iniciado || document.visibilityState === "hidden") return;
  prioridad = Math.max(Date.now(), prioridad + 1, prioridadObservada + 1, prioridadAlmacenada() + 1);
  inactiva = false;
  document.getElementById(ID_AVISO)?.remove();

  const mensaje = { tipo: TIPO, id, prioridad };
  try { canal?.postMessage(mensaje); } catch {}
  try { localStorage.setItem(CLAVE, JSON.stringify(mensaje)); } catch {}
}

function recibirTomaDeSesion(mensaje) {
  if (!mensaje || mensaje.tipo !== TIPO || !mensaje.id || mensaje.id === id) return;
  const otraPrioridad = Number(mensaje.prioridad);
  if (!Number.isFinite(otraPrioridad) || otraPrioridad <= 0) return;
  prioridadObservada = Math.max(prioridadObservada, otraPrioridad);

  // Una respuesta de una ventana antigua no debe desplazar una sesión nueva.
  if (otraPrioridad < prioridad || (otraPrioridad === prioridad && String(mensaje.id) < id)) return;
  inactiva = true;
  mostrarSesionAnteriorInactiva();
}

function mostrarSesionAnteriorInactiva() {
  if (document.getElementById(ID_AVISO)) return;
  const fondo = document.createElement("div");
  fondo.id = ID_AVISO;
  fondo.setAttribute("role", "alertdialog");
  fondo.setAttribute("aria-modal", "true");
  fondo.style.cssText = "position:fixed;inset:0;z-index:2147483645;background:#131923;color:white;display:flex;align-items:center;justify-content:center;padding:22px;box-sizing:border-box";
  const panel = document.createElement("section");
  panel.style.cssText = "width:min(100%,430px);padding:22px;border-radius:16px;background:#252d32;line-height:1.5;font:17px Arial,sans-serif;box-sizing:border-box";
  const titulo = document.createElement("h2");
  titulo.textContent = "Informes GP abierto en otra ventana";
  const explicacion = document.createElement("p");
  explicacion.textContent = "Esta ventana anterior quedó inactiva. Continuá usando la última que abriste. El informe que estabas completando no se borró.";
  const boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = "Usar esta ventana";
  boton.style.cssText = "padding:12px 18px;border:0;border-radius:8px;font-weight:700;cursor:pointer";
  boton.addEventListener("click", tomarSesion);
  panel.append(titulo, explicacion, boton);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
}

function prioridadAlmacenada() {
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE) || "null");
    return Number(valor?.prioridad) || 0;
  } catch {
    return 0;
  }
}

function crearId() {
  try { if (crypto.randomUUID) return crypto.randomUUID(); } catch {}
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
