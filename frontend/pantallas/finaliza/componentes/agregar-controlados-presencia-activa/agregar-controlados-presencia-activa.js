import { cargarComponenteHtml } from "../../../../servicios/ui/cargar-componente-html.js";

const RUTA_HTML = "/frontend/pantallas/finaliza/componentes/agregar-controlados-presencia-activa/agregar-controlados-presencia-activa.html";

export async function iniciarAgregarControladosPresenciaActiva({
  form,
  activo = false,
  onChange
} = {}) {
  const host = form?.querySelector?.("#finalizaAgregarControladosPresenciaHost");
  if (!host) return null;

  if (!host.dataset.componenteCargado) {
    host.innerHTML = await cargarComponenteHtml(RUTA_HTML);
    host.dataset.componenteCargado = "1";

    const check = host.querySelector("#finalizaAgregarControladosPresencia");
    check?.addEventListener("change", () => {
      aplicarVisibilidadControlados(form);
      if (typeof onChange === "function") onChange();
    });
  }

  configurarAgregarControladosPresenciaActiva({ form, activo, reset: true });
  return host.querySelector("#finalizaAgregarControladosPresencia");
}

export function configurarAgregarControladosPresenciaActiva({
  form,
  activo = false,
  reset = true
} = {}) {
  const host = form?.querySelector?.("#finalizaAgregarControladosPresenciaHost");
  const check = host?.querySelector?.("#finalizaAgregarControladosPresencia");

  host?.classList.toggle("hidden", !activo);
  form?.classList.toggle("finaliza-controlados-opcionales", Boolean(activo));

  if (check) {
    check.disabled = !activo;
    if (reset || !activo) check.checked = false;
  }

  aplicarVisibilidadControlados(form);
}

export function debeAgregarControladosPresenciaActiva(form) {
  if (!form?.classList?.contains("finaliza-controlados-opcionales")) return true;
  return Boolean(form.querySelector("#finalizaAgregarControladosPresencia")?.checked);
}

function aplicarVisibilidadControlados(form) {
  const esEspecial = form?.classList?.contains("finaliza-controlados-opcionales");
  const check = form?.querySelector?.("#finalizaAgregarControladosPresencia");
  const mostrar = !esEspecial || Boolean(check?.checked);

  form?.querySelector?.(".finaliza-resultados-card")?.classList.toggle("hidden", !mostrar);
  form?.querySelector?.(".finaliza-detalles-card")?.classList.toggle("hidden", !mostrar);
}
