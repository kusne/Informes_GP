export function mapearInformeEspecialParaSupabase(informe) {
  if (!informe) return null;

  return limpiarObjeto({
    guardia_fecha: informe.guardia_fecha,
    operativo_key: informe.operativo_key,
    tipo_informe: informe.modelo,
    tipo_operativo: informe.tipo_operativo,
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
    fecha_evento: informe.fecha
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

function normalizarNumerales(items = []) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    codigo: item.codigo || "",
    cantidad: Number(item.cantidad || 1),
    detalle: item.detalle || "",
    categoria: item.categoria || "SUGERIDO"
  }));
}

function limpiarObjeto(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, valor]) => valor !== undefined)
  );
}