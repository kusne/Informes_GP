import {
  resolverOrdenesOrigenOperativo,
  resolverTipoNombreOperativo
} from "../compartido/operativo-identidad.js";

export function mapearFinalizadoParaSupabase(finalizado) {
  if (!finalizado) return null;

  const f = finalizado.formulario || {};
  const numerales = finalizado.numeralesFinaliza || { items: [], resumen: "", texto: "" };
  const tipoNombre = resolverTipoNombreOperativo(finalizado, finalizado.operativo);
  const ordenesOrigen = resolverOrdenesOrigenOperativo(finalizado, finalizado.operativo);

  return limpiarObjeto({
    guardia_fecha: finalizado.guardia_fecha,
    operativo_key: finalizado.operativo_key,
    tipo_evento: "FINALIZADO",
    estado: "FINALIZADO",
    tipo_operativo: finalizado.tipo_operativo,
    tipo_nombre: tipoNombre,
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
      fecha_operativo: finalizado.fecha_operativo || finalizado.operativo?.fecha_operativo || finalizado.operativo?.datos?.fecha_operativo || "",
      tipo_nombre: tipoNombre,
      ordenes_origen: ordenesOrigen,
      fotos: normalizarFotos(finalizado.fotos),
      foto_prefijo: finalizado.foto_prefijo || "",
      recursos_finalizado: {
        personal: f.personal || "",
        moviles_motos: f.moviles_motos || "",
        elementos: f.elementos || "",
        fuente_personal: f.mismo_personal ? "INICIO" : "FINALIZADO_MANUAL",
        fuente_movilidad: f.mismo_moviles ? "INICIO" : "FINALIZADO_MANUAL",
        fuente_elementos: f.mismos_elementos ? "INICIO" : "FINALIZADO_MANUAL"
      },
      resultados: {
        vehiculos: numero(f.vehiculos),
        personas: numero(f.personas),
        test_alometro: numero(f.test_alometro),
        test_alcoholimetro: numero(f.test_alcoholimetro),
        positiva_sancionable: numero(f.positiva_sancionable),
        positiva_no_sancionable: numero(f.positiva_no_sancionable),
        graduaciones_sancionable: normalizarArrayTexto(f.graduaciones_sancionable),
        graduaciones_no_sancionable: normalizarArrayTexto(f.graduaciones_no_sancionable),
        actas: numero(f.actas),
        decreto_460_22: numero(f.decreto_460_22),
        assal: numero(f.assal),
        control_armas: numero(f.control_armas),
        requisas: numero(f.requisas),
        qrz: numero(f.qrz),
        qrz_documentos: normalizarArrayTexto(f.qrz_documentos),
        dominio: numero(f.dominio),
        dominio_items: normalizarArrayTexto(f.dominio_items)
      },
      medidas_cautelares: {
        remision: numero(f.remision),
        retencion: numero(f.retencion),
        prohibicion_circulacion: numero(f.prohibicion_circulacion),
        cesion_conduccion: numero(f.cesion_conduccion)
      },
      detalles: f.detalles || "",
      observaciones: f.observaciones || "",
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

function normalizarFotos(fotos = []) { return Array.isArray(fotos) ? fotos.map((foto) => ({ indice: foto.indice, nombre: foto.nombre, urlTemporal: foto.urlTemporal || null })) : []; }
function normalizarArrayTexto(valor) {
  if (Array.isArray(valor)) return valor.map((v) => String(v || "").trim()).filter(Boolean);
  try {
    const parsed = JSON.parse(String(valor || "[]"));
    return Array.isArray(parsed) ? parsed.map((v) => String(v || "").trim()).filter(Boolean) : [];
  } catch { return []; }
}
function numero(valor) { const n = Number(valor || 0); return Number.isFinite(n) && n >= 0 ? n : 0; }
function limpiarObjeto(obj) { return Object.fromEntries(Object.entries(obj).filter(([, valor]) => valor !== undefined)); }
