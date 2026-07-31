export function mapearFinalizadoParaSupabase(finalizado) {
  if (!finalizado) return null;

  const f = finalizado.formulario || {};
  const numerales = finalizado.numeralesFinaliza || {
    items: [],
    resumen: "",
    texto: ""
  };

  return limpiarObjeto({
    guardia_fecha: finalizado.guardia_fecha,
    operativo_key: finalizado.operativo_key,
    tipo_evento: "FINALIZADO",
    estado: "FINALIZADO",
    tipo_operativo: finalizado.tipo_operativo,
    hora_inicio: finalizado.hora_inicio,
    hora_fin: finalizado.hora_fin,
    lugar: finalizado.lugar,
    actas: numero(f.actas),
    personas: numero(f.personas),
    vehiculos: numero(f.vehiculos),
    numerales_texto: numerales.texto || f.numerales || "",
    numerales_items: Array.isArray(numerales.items) ? numerales.items : [],
    numerales_resumen: numerales.resumen || "",
    observaciones: f.observaciones || "",
    texto_salida: finalizado.texto || "",
    foto_prefijo: finalizado.foto_prefijo || "",
    datos: {
      fotos: normalizarFotos(finalizado.fotos),
      foto_prefijo: finalizado.foto_prefijo || "",
      numerales: {
        items: Array.isArray(numerales.items) ? numerales.items : [],
        resumen: numerales.resumen || "",
        texto: numerales.texto || ""
      }
    },
    origen: "Informes_GP",
    fecha_evento: finalizado.fecha
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

function numero(valor) {
  const n = Number(valor || 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function limpiarObjeto(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, valor]) => valor !== undefined)
  );
}