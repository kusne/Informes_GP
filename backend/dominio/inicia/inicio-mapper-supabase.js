export function mapearInicioParaSupabase(inicio) {
  if (!inicio) return null;

  const f = inicio.formulario || {};

  return limpiarObjeto({
    guardia_fecha: inicio.guardia_fecha,
    operativo_key: inicio.operativo_key,
    tipo_evento: "INICIO",
    estado: "EN_CURSO",
    tipo_operativo: inicio.tipo_operativo,
    hora_inicio: inicio.hora_inicio,
    hora_fin: inicio.hora_fin,
    lugar: inicio.lugar,
    personal: f.personal || "",
    moviles_motos: f.moviles_motos || "",
    elementos: f.elementos || "",
    observaciones: f.observaciones || "",
    texto_salida: inicio.texto || "",
    foto_prefijo: inicio.foto_prefijo || "",
    datos: {
      fotos: normalizarFotos(inicio.fotos),
      foto_prefijo: inicio.foto_prefijo || ""
    },
    origen: "Informes_GP",
    fecha_evento: inicio.fecha
  });
}

function normalizarFotos(fotos = []) {
  if (!Array.isArray(fotos)) return [];

  return fotos.map((foto) => ({
    indice: foto.indice,
    nombre: foto.nombre,
    urlTemporal: foto.urlTemporal || null
  }));
}

function limpiarObjeto(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, valor]) => valor !== undefined)
  );
}