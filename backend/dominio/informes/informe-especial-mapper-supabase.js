export function mapearInformeEspecialParaSupabase(informe) {
  if (!informe) return null;

  const fechaEvento = informe.fecha || new Date().toISOString();
  const fechaInforme = resolverFechaInforme(informe, fechaEvento);
  const horaInforme = resolverHoraInforme(informe, fechaEvento);
  const tipoInforme = normalizarModelo(informe.modelo || informe.tipo_informe || "");
  const operativoKey = String(informe.operativo_key || "").trim();

  return limpiarObjeto({
    informe_key: construirInformeKey({
      informeKey: informe.informe_key,
      operativoKey,
      tipoInforme,
      fechaEvento
    }),
    guardia_fecha: informe.guardia_fecha,
    fecha_informe: fechaInforme,
    hora_informe: horaInforme,
    operativo_key: operativoKey,
    tipo_informe: tipoInforme,
    tipo_operativo: normalizarTipo(informe.tipo_operativo || "GENERICO"),
    hora_inicio: informe.hora_inicio,
    hora_fin: informe.hora_fin,
    lugar: informe.lugar,
    foto_prefijo: informe.foto_prefijo || "",
    datos: {
      ...(informe.formulario || {}),
      fotos: normalizarFotos(informe.fotos),
      numerales_sugeridos: normalizarNumerales(informe.numerales_sugeridos),
      incrementos_sugeridos: informe.incrementos_sugeridos || {}
    },
    calculos: {
      ...(informe.calculos || {}),
      numerales_sugeridos: normalizarNumerales(informe.numerales_sugeridos),
      incrementos_sugeridos: informe.incrementos_sugeridos || {}
    },
    texto_salida: informe.texto || "",
    origen: "Informes_GP",
    activo: true,
    fecha_evento: fechaEvento
  });
}

function resolverFechaInforme(informe = {}, fechaEvento) {
  const formulario = informe.formulario || {};
  const candidata =
    formulario.fecha_hecho ||
    formulario.fecha ||
    informe.fecha_informe ||
    informe.operativo?.fecha_operativo ||
    "";

  const iso = normalizarFechaISO(candidata);
  if (iso) return iso;

  const fecha = fechaLocalDesdeValor(fechaEvento);
  return formatearFechaLocalISO(fecha);
}

function resolverHoraInforme(informe = {}, fechaEvento) {
  const formulario = informe.formulario || {};
  const candidata =
    formulario.hora_hecho ||
    formulario.hora ||
    informe.hora_informe ||
    "";

  const hora = normalizarHora(candidata);
  if (hora) return hora;

  const fecha = fechaLocalDesdeValor(fechaEvento);
  return `${pad2(fecha.getHours())}:${pad2(fecha.getMinutes())}`;
}

function construirInformeKey({ informeKey, operativoKey, tipoInforme, fechaEvento }) {
  const existente = String(informeKey || "").trim();
  if (existente) return existente;

  const marca = String(fechaEvento || new Date().toISOString())
    .replace(/[^0-9]/g, "")
    .slice(0, 17);

  return [
    "IGP",
    normalizarComponenteClave(tipoInforme || "INFORME"),
    normalizarComponenteClave(operativoKey || "SIN_OPERATIVO"),
    marca || String(Date.now())
  ].join("|");
}

function normalizarComponenteClave(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

function normalizarFechaISO(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";

  let m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;

  return "";
}

function normalizarHora(valor) {
  const texto = String(valor || "").trim();
  const m = texto.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!m) return "";

  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return "";
  return `${pad2(hh)}:${pad2(mm)}`;
}

function fechaLocalDesdeValor(valor) {
  const fecha = new Date(valor || Date.now());
  if (!Number.isNaN(fecha.getTime())) return fecha;
  return new Date();
}

function formatearFechaLocalISO(fecha) {
  return `${fecha.getFullYear()}-${pad2(fecha.getMonth() + 1)}-${pad2(fecha.getDate())}`;
}

function pad2(valor) {
  return String(valor).padStart(2, "0");
}

function normalizarFotos(fotos = []) {
  if (!Array.isArray(fotos)) return [];

  return fotos.map((foto) => ({
    indice: foto.indice,
    nombre: foto.nombre,
    urlTemporal: foto.urlTemporal || null,
    bucket: foto.bucket || "",
    path: foto.path || "",
    url_publica: foto.url_publica || ""
  }));
}

function normalizarNumerales(items = []) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    codigo: item.codigo || "",
    cantidad: Number(item.cantidad || 1),
    detalle: item.detalle || "",
    categoria: item.categoria || "SUGERIDO"
  }));
}

function normalizarModelo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_")
    .replace("DECTO_460_22", "DECRETO_460_22");
}

function normalizarTipo(valor) {
  return String(valor || "GENERICO")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

function limpiarObjeto(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, valor]) => valor !== undefined)
  );
}
