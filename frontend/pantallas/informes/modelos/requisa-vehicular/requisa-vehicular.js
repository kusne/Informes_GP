export async function iniciarModeloInformeUI({ form, operativoSeleccionado } = {}) {
  if (!form) return;

  const op = operativoSeleccionado || {};

  // Estos datos forman parte del contexto del operativo y permanecen ocultos.
  // El builder general vuelve a actualizarlos si el usuario cambia de operativo.
  establecerCampo(form, "fecha_hecho", fechaOperativo(op) || fechaActual());
  establecerCampo(form, "hora_hecho", horaActual());
  establecerCampo(form, "lugar_hecho", primerTexto(op.lugar, op.qth, op.ubicacion));
  establecerCampo(form, "personal", resolverDatoOperativo(op, "personal"));
  establecerCampo(form, "moviles", resolverDatoOperativo(op, "moviles_motos"));
}

function resolverDatoOperativo(op = {}, clave) {
  const datos = objeto(op.datos);
  const snapshot = objeto(datos.inicio_snapshot);

  return primerTexto(
    snapshot[clave],
    op[clave],
    datos[clave],
    clave === "moviles_motos" ? datos.movilidad : ""
  );
}

function fechaOperativo(op = {}) {
  const valor = primerTexto(op.fecha_operativo, op.guardia_fecha, op.fecha);
  const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

function establecerCampo(form, nombre, valor) {
  const campo = form?.querySelector(`[name="${nombre}"]`);
  if (!campo) return;
  campo.value = String(valor ?? "").trim();
}

function fechaActual() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${pad2(ahora.getMonth() + 1)}-${pad2(ahora.getDate())}`;
}

function horaActual() {
  const ahora = new Date();
  return `${pad2(ahora.getHours())}:${pad2(ahora.getMinutes())}`;
}

function pad2(valor) {
  return String(valor).padStart(2, "0");
}

function objeto(valor) {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};
}

function primerTexto(...valores) {
  for (const valor of valores) {
    const limpio = String(valor ?? "").trim();
    if (limpio && limpio !== "[object Object]") return limpio;
  }
  return "";
}
