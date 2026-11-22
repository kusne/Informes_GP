// Cambio reversible de modalidad de trabajo: conserva identidad, dotación y órdenes.
import { anexarOrdenesAlTitulo, resolverOrdenesOrigenOperativo } from "../compartido/operativo-identidad.js";
import { formatearTituloOperativo, formatearLugarOperativo } from "../compartido/texto/formato-titulos-operativos.js";
import { resolverRecursosInicioParaFinaliza, normalizarPersonalSalidaFinaliza } from "../finaliza/recursos-finaliza.js";

export const MOTIVOS_PRESENCIA_ACTIVA = Object.freeze([
  { valor: "LLUVIA", etiqueta: "Lluvia" },
  { valor: "VIENTO_FUERTE", etiqueta: "Fuertes ráfagas de viento" },
  { valor: "NEBLINA", etiqueta: "Baja visibilidad por neblina" },
  { valor: "HUMO", etiqueta: "Baja visibilidad por humo" },
  { valor: "OTROS", etiqueta: "Otro motivo" }
]);

const MOTIVOS_TEXTO = Object.freeze({
  LLUVIA: "lluvia",
  VIENTO_FUERTE: "fuertes ráfagas de viento",
  NEBLINA: "baja visibilidad por neblina",
  HUMO: "baja visibilidad por humo"
});

const limpio = valor => String(valor ?? "").trim();
const negrita = valor => "*" + limpio(valor) + "*";
const objeto = valor => valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};

export function estaEnPresenciaActiva(operativo = {}) {
  return objeto(objeto(operativo.datos).presencia_activa).activa === true;
}

export function horaReporteBuenosAires(fecha = new Date()) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit",
    minute: "2-digit", hourCycle: "h23"
  }).format(fecha);
}

function fechaReporteBuenosAires(fecha) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit", month: "2-digit", year: "numeric"
  }).format(fecha);
}

function descripcionMotivo(motivo, otro) {
  if (motivo === "OTROS") {
    const especifico = limpio(otro);
    if (!especifico) throw Error("Indicá cuál es el otro motivo de Presencia Activa.");
    return especifico;
  }
  if (!MOTIVOS_TEXTO[motivo]) throw Error("Seleccioná el motivo de Presencia Activa.");
  return MOTIVOS_TEXTO[motivo];
}

function construirElementos(valor) {
  const base = [
    "Escopetas: /", "Ht: /", "Pda: /",
    "Impresoras: /", "Alómetros: /", "Alcoholímetros: /"
  ];
  const lineas = limpio(valor).split(/\r?\n/).map(limpio).filter(Boolean);
  if (!lineas.length) return base.join("\n");
  const mapa = new Map(lineas.map(linea => [linea.split(":")[0].trim().toLowerCase(), linea]));
  return base.map(linea => mapa.get(linea.split(":")[0].toLowerCase()) || linea).join("\n");
}

export function prepararCambioPresenciaActiva({
  operativo, accion, motivo = "", otro_motivo = "", hora_reporte = "",
  observacion_adicional = "", adjunta_vista = false, fecha_evento = new Date().toISOString()
} = {}) {
  if (!operativo?.operativo_key || !operativo?.guardia_fecha ||
      limpio(operativo.estado).toUpperCase() !== "EN_CURSO") {
    throw Error("Sólo se admite un operativo EN CURSO con un INICIO registrado.");
  }
  if (!["INICIAR", "RETOMAR"].includes(accion)) throw Error("Acción de Presencia Activa inválida.");
  const activo = estaEnPresenciaActiva(operativo);
  if (accion === "INICIAR" && activo) throw Error("Este operativo ya está en Presencia Activa.");
  if (accion === "RETOMAR" && !activo) throw Error("Este operativo ya se desarrolla normalmente.");

  const hora = limpio(hora_reporte);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
    throw Error("Ingresá una hora válida en formato HH:MM.");
  }
  const fecha = new Date(fecha_evento);
  if (Number.isNaN(fecha.getTime())) throw Error("La fecha del evento no es válida.");
  const motivoTexto = accion === "INICIAR" ? descripcionMotivo(motivo, otro_motivo) : "";

  const datos = objeto(operativo.datos);
  const snapshot = objeto(datos.inicio_snapshot);
  const recursos = resolverRecursosInicioParaFinaliza(operativo);
  const nombre = formatearTituloOperativo(
    limpio(snapshot.tipo_nombre || operativo.tipo_nombre || operativo.tipo_operativo || "Operativo")
  );
  const titulo = anexarOrdenesAlTitulo(nombre, resolverOrdenesOrigenOperativo(
    { operativo, ...snapshot }, operativo
  ));
  const personal = normalizarPersonalSalidaFinaliza(
    recursos.personal || recursos.seleccionInicial?.personal || snapshot.personal || operativo.personal
  );
  const moviles = limpio(recursos.moviles_motos || snapshot.moviles_motos || operativo.moviles_motos);
  const elementos = construirElementos(
    recursos.elementos || snapshot.elementos || operativo.elementos
  );
  const observaciones = accion === "INICIAR"
    ? "Se informa que siendo la hora y en lugar Ut-supra se comienza a realizar Presencia Activa por " + motivoTexto + "."
    : "Se informa que siendo la hora y en lugar Ut-supra se retoma el operativo con normalidad, finalizando la modalidad de Presencia Activa.";

  const lineas = [
    negrita("Policia de la Provincia de Santa Fe - Direccion General Guardia Provincial"),
    negrita("Brigada Motorizada Centro Norte"),
    negrita("Tercio Charlie"),
    "",
    negrita((accion === "INICIAR" ? "Presencia Activa " : "Retoma de Operativo ") + titulo),
    "",
    negrita("Fecha:") + " " + fechaReporteBuenosAires(fecha),
    negrita("Horario:") + " " + hora,
    negrita("Lugar:") + " " + formatearLugarOperativo(operativo.lugar || snapshot.lugar),
    "",
    negrita("Personal Policial:"),
    personal || "/",
    "",
    negrita("Móviles:") + " " + (moviles || "/"),
    "",
    negrita("Elementos:"),
    elementos,
    "",
    negrita("Observaciones:"),
    observaciones +
      (limpio(observacion_adicional) ? "\n" + limpio(observacion_adicional) : "") +
      (adjunta_vista ? "\nSe adjunta vista fotográfica." : "")
  ];
  const texto = lineas.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return {
    texto,
    evento: {
      tipo: accion === "INICIAR" ? "PRESENCIA_ACTIVA" : "RETOMA_OPERATIVO",
      accion,
      hora_reporte: hora,
      fecha_evento,
      motivo: accion === "INICIAR" ? motivo : "",
      motivo_descripcion: motivoTexto,
      observacion_adicional: limpio(observacion_adicional),
      adjunta_vista: Boolean(adjunta_vista),
      texto
    }
  };
}
