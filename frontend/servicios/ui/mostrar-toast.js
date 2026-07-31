export function mostrarToast(mensaje, opciones = {}) {
  const duracion = opciones.duracion || 2500;

  let contenedor = document.getElementById("toastInformesGP");

  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "toastInformesGP";
    contenedor.style.position = "fixed";
    contenedor.style.left = "50%";
    contenedor.style.bottom = "18px";
    contenedor.style.transform = "translateX(-50%)";
    contenedor.style.zIndex = "9999";
    contenedor.style.padding = "10px 14px";
    contenedor.style.borderRadius = "10px";
    contenedor.style.background = "#111827";
    contenedor.style.color = "#ffffff";
    contenedor.style.fontWeight = "700";
    contenedor.style.maxWidth = "90vw";
    contenedor.style.textAlign = "center";
    document.body.appendChild(contenedor);
  }

  contenedor.textContent = String(mensaje || "");

  window.clearTimeout(contenedor.__timerToast);

  contenedor.__timerToast = window.setTimeout(() => {
    contenedor.remove();
  }, duracion);
}
