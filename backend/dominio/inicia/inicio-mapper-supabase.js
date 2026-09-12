import {
  resolverOrdenesOrigenOperativo,
  resolverTipoNombreOperativo
} from "../compartido/operativo-identidad.js";

export function mapearInicioParaSupabase(inicio) {
  if (!inicio) return null;

  const f = inicio.formulario || {};
  const tipoNombre = resolverTipoNombreOperativo(inicio, inicio.operativo);
  const ordenesOrigen = resolverOrdenesOrigenOperativo(inicio, inicio.operativo);
  const fotos = normalizarFotos(inicio.fotos);
  const presenciaActiva = Boolean(f.presencia_activa);
  const motivoPresenciaActiva = resolverMotivoPresenciaActiva(f);
  const snapshot = {
    tipo_operativo: inicio.tipo_operativo,
    tipo_nombre: tipoNombre,
    ordenes_origen: ordenesOrigen,
    fecha_operativo: inicio.fecha_operativo || inicio.operativo?.fecha_operativo || "",
    hora_inicio: inicio.hora_inicio,
    hora_fin: inicio.hora_fin,
    lugar: inicio.lugar,
    personal: f.personal || "",
    moviles_motos: f.moviles_motos || "",
    elementos: f.elementos || "",
    presencia_activa: presenciaActiva,
    presencia_activa_motivo: motivoPresenciaActiva,
    observaciones: f.observaciones || "",
    texto_salida: inicio.texto || "",
    foto_prefijo: inicio.foto_prefijo || "",
    fotos
  };

  return limpiarObjeto({
    guardia_fecha: inicio.guardia_fecha,
    operativo_key: inicio.operativo_key,
    tipo_evento: "INICIO",
    estado: "EN_CURSO",
    tipo_operativo: inicio.tipo_operativo,
    tipo_nombre: tipoNombre,
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
      fecha_operativo: snapshot.fecha_operativo,
      tipo_nombre: tipoNombre,
      ordenes_origen: ordenesOrigen,
      presencia_activa: presenciaActiva,
      presencia_activa_motivo: motivoPresenciaActiva,
      fotos,
      foto_prefijo: inicio.foto_prefijo || "",
      inicio_snapshot: snapshot
    },
    origen: "Informes_GP",
    fecha_evento: inicio.fecha
  });
}

function resolverMotivoPresenciaActiva(formulario = {}) {
  if (!formulario.presencia_activa) return "";
  const motivo = String(formulario.presencia_activa_motivo || "").trim().toUpperCase();
  if (motivo === "LLUVIA") return "Lluvia";
  if (motivo === "OTROS") return String(formulario.presencia_activa_otro || "").trim();
  return "";
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
