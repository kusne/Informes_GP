export async function iniciarModeloInformeUI({ form, operativoSeleccionado } = {}) {
  if (!form) return;
  const op = operativoSeleccionado || {};
  completarSiVacio(form, "fecha_hecho", fechaOperativo(op));
  completarSiVacio(form, "hora_hecho", horaActual());
  completarSiVacio(form, "lugar_hecho", op.lugar || "");
  completarSiVacio(form, "personal", valorOperativo(op, "personal", "personal"));
  completarSiVacio(form, "moviles", valorOperativo(op, "moviles_motos", "moviles_motos"));
}

function completarSiVacio(form, nombre, valor) {
  const campo = form?.querySelector(`[name="${nombre}"]`);
  if (!campo || String(campo.value || "").trim() || valor === null || valor === undefined) return;
  campo.value = String(valor || "").trim();
}

function fechaOperativo(op = {}) {
  const valor = String(op.fecha_operativo || op.guardia_fecha || "").trim();
  const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

function horaActual() {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
}

function valorOperativo(op = {}, directo, dentroDatos) {
  return String(op?.[directo] || op?.datos?.[dentroDatos] || "").trim();
}
