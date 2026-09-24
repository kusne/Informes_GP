// Opciones de identidad visual: agregar aquí los futuros colores del escudo.
const CLAVE_PREFERENCIA = "informesgp-logo-color-v1";
const LOGOS = Object.freeze({
  blanco: "frontend/assets/logo-bmzcn-white.png",
  dorado: "frontend/assets/logo-bmzcn-gold-black.png"
});
const URL_BASE = new URL("../../../", import.meta.url);

function leerPreferencia() {
  try {
    const preferencia = localStorage.getItem(CLAVE_PREFERENCIA);
    return Object.hasOwn(LOGOS, preferencia) ? preferencia : "blanco";
  } catch {
    return "blanco";
  }
}

function aplicarLogo(color) {
  const elegido = Object.hasOwn(LOGOS, color) ? color : "blanco";
  document.documentElement.dataset.igpLogo = elegido;
  const recurso = new URL(LOGOS[elegido], URL_BASE).href;

  // Sólo reemplazar la imagen corporativa, no los íconos de la PWA ni otros
  // archivos adjuntos. Nunca se reconstruye el formulario o su selección.
  document.querySelectorAll(".brand img.brand-logo, .brand img.logo-principal")
    .forEach((imagen) => {
      if (imagen.getAttribute("src") !== recurso) imagen.src = recurso;
    });

  const selector = document.getElementById("igpSelectorColorLogo");
  if (selector && selector.value !== elegido) selector.value = elegido;
}

export function iniciarSelectorColorLogo() {
  const brand = document.querySelector(".pantalla-principal .brand");
  if (!brand) return;

  const texto = brand.querySelector(".brand-text");
  if (!texto) return;

  if (!document.getElementById("igpSelectorColorLogo")) {
    const label = document.createElement("label");
    label.className = "igp-logo-config";
    label.htmlFor = "igpSelectorColorLogo";
    label.appendChild(document.createTextNode("Logo: "));

    const selector = document.createElement("select");
    selector.id = "igpSelectorColorLogo";
    selector.setAttribute("aria-label", "Seleccionar color del logo y títulos");
    for (const [valor, nombre] of [["blanco", "Blanco"], ["dorado", "Dorado"]]) {
      const opcion = document.createElement("option");
      opcion.value = valor;
      opcion.textContent = nombre;
      selector.appendChild(opcion);
    }

    selector.addEventListener("change", () => {
      const color = selector.value;
      if (!Object.hasOwn(LOGOS, color)) return;
      try { localStorage.setItem(CLAVE_PREFERENCIA, color); } catch {}
      aplicarLogo(color);
    });
    label.appendChild(selector);
    texto.appendChild(label);
  }

  aplicarLogo(leerPreferencia());
}

window.addEventListener("storage", (evento) => {
  if (evento.key === CLAVE_PREFERENCIA) aplicarLogo(leerPreferencia());
});
