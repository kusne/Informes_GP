/**
 * Selector de Juzgado compartido por Decreto 460/22 y medidas de retención.
 * Utiliza exclusivamente los estilos habituales de .bloque-formulario.
 */
export function iniciarSelectorJuzgado(form, { selectorRetencion = "" } = {}) {
  const bloque = form?.querySelector("[data-juzgado-wrap]");
  const select = bloque?.querySelector('[name="juzgado"]');
  const otroWrap = bloque?.querySelector("[data-juzgado-otro-wrap]");
  const otro = otroWrap?.querySelector('[name="juzgado_otro"]');
  const retencion = selectorRetencion ? form.querySelector(selectorRetencion) : null;
  if (!bloque || !select || !otroWrap || !otro) return () => {};

  const actualizar = () => {
    const habilitado = !selectorRetencion || Boolean(retencion?.checked);
    bloque.hidden = !habilitado;
    select.disabled = !habilitado;
    if (!habilitado) select.value = "SANTA FE";
    const personalizado = habilitado && select.value === "OTRO";
    otroWrap.hidden = !personalizado;
    otro.disabled = !personalizado;
    otro.required = personalizado;
    if (!personalizado) otro.value = "";
  };

  select.addEventListener("change", actualizar);
  retencion?.addEventListener("change", actualizar);
  otro.addEventListener("input", () => {
    const cursor = otro.selectionStart;
    const valor = otro.value.toLocaleUpperCase("es-AR");
    if (valor !== otro.value) {
      otro.value = valor;
      if (cursor !== null) try { otro.setSelectionRange(cursor, cursor); } catch {}
    }
  });
  actualizar();
  return actualizar;
}
