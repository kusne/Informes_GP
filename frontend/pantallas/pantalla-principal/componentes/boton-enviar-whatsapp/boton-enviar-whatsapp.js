import { cargarComponenteHtml } from "../../../../servicios/ui/cargar-componente-html.js";
import { prepararEnvioWhatsapp } from "../../../../servicios/whatsapp/salida-whatsapp.js";

export async function renderBotonEnviarWhatsapp({ hostSelector, getContexto }) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  host.innerHTML = await cargarComponenteHtml("/frontend/pantallas/pantalla-principal/componentes/boton-enviar-whatsapp/boton-enviar-whatsapp.html");

  const btn = document.getElementById("btnEnviarWhatsapp");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const contexto = typeof getContexto === "function" ? getContexto() : {};
    const resultado = prepararEnvioWhatsapp(contexto);

    if (!resultado.ok) {
      alert(resultado.mensaje || "No se pudo preparar el envío.");
      return;
    }

    alert(resultado.texto);
  });
}






