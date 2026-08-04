import { cargarComponenteHtml } from "../../../../servicios/ui/cargar-componente-html.js";

const RUTA_HTML = "/frontend/pantallas/inicia/componentes/agregar-elementos-presencia-activa/agregar-elementos-presencia-activa.html";

export async function iniciarAgregarElementosPresenciaActiva({
  form,
  activo = false,
  onChange
} = {}) {
  const host = form?.querySelector?.("#inicioAgregarElementosPresenciaHost");
  if (!host) return null;

  if (!host.dataset.componenteCargado) {
    host.innerHTML = await cargarComponenteHtml(RUTA_HTML);
    host.dataset.componenteCargado = "1";

    const check = host.querySelector("#inicioAgregarElementosPresencia");
    check?.addEventListener("change", () => {
      aplicarVisibilidadElementos(form);
      if (typeof onChange === "function") onChange();
    });
  }

  configurarAgregarElementosPresenciaActiva({ form, activo, reset: true });
  return host.querySelector("#inicioAgregarElementosPresencia");
}

export function configurarAgregarElementosPresenciaActiva({
  form,
  activo = false,
  reset = true
} = {}) {
  const host = form?.querySelector?.("#inicioAgregarElementosPresenciaHost");
  const check = host?.querySelector?.("#inicioAgregarElementosPresencia");

  host?.classList.toggle("hidden", !activo);
  form?.classList.toggle("inicio-elementos-opcionales", Boolean(activo));

  if (check) {
    check.disabled = !activo;
    if (reset || !activo) check.checked = false;
  }

  aplicarVisibilidadElementos(form);
}

export function debeAgregarElementosPresenciaActiva(form) {
  if (!form?.classList?.contains("inicio-elementos-opcionales")) return true;
  return Boolean(form.querySelector("#inicioAgregarElementosPresencia")?.checked);
}

function aplicarVisibilidadElementos(form) {
  const hostElementos = form?.querySelector?.("#inicioElementosHost");
  if (!hostElementos) return;

  const esEspecial = form.classList.contains("inicio-elementos-opcionales");
  const check = form.querySelector("#inicioAgregarElementosPresencia");
  const mostrar = !esEspecial || Boolean(check?.checked);
  hostElementos.classList.toggle("hidden", !mostrar);
}
