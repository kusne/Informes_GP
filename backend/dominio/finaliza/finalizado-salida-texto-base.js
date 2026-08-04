import { normalizarPersonalSalidaFinaliza } from "./recursos-finaliza.js";
import {
  usaControladosOpcionalesFinaliza,
  hayControladosFinaliza
} from "../compartido/tipos/operativos-elementos-controlados-opcionales.js";
import { esOperativoPatrullaje } from "../compartido/tipos/patrullaje.js";

export function construirTextoFinalizadoBase(finalizado) {
  if (!finalizado) return "";

  const f = finalizado.formulario || {};
  const operativo = finalizado.operativo || {};
  const numerales = finalizado.numeralesFinaliza || {};
  const lineas = [];
  const controladosOpcionales = usaControladosOpcionalesFinaliza(operativo, finalizado?.tipo_operativo);
  const imprimirControlados = !controladosOpcionales || (Boolean(f.agregar_controlados) && hayControladosFinaliza(f));

  lineas.push(negrita("Policia de la Provincia de Santa Fe - Direccion General Guardia Provincial"));
  lineas.push(negrita("Brigada Motorizada Centro Norte"));
  lineas.push(negrita("Tercio Charlie"));
  lineas.push("");
  lineas.push(negrita(`Finaliza ${resolverTituloOperativo(finalizado, operativo)}`.trim()));
  lineas.push("");
  lineas.push(`${negrita("Fecha:")} ${formatearFecha(finalizado.fecha_operativo || operativo?.fecha_operativo || finalizado.fecha)}`);
  lineas.push(`${negrita("Horario:")} ${formatearHorario(finalizado)}`);
  lineas.push(`${negrita("Lugar:")} ${normalizarLugar(finalizado.lugar)}`);
  lineas.push("");
  lineas.push(negrita("Personal Policial:"));
  lineas.push(normalizarPersonalSalidaFinaliza(f.personal) || "/");
  lineas.push("");
  lineas.push(`${negrita("Móviles:")} ${texto(f.moviles_motos) || "/"}`);
  lineas.push("");
  lineas.push(negrita("Elementos:"));
  lineas.push(texto(f.elementos) || construirElementosVacios());

  if (imprimirControlados) {
    lineas.push("");
    lineas.push(negrita("Resultados:"));
    lineas.push(`Vehículos Fiscalizados: (${cantidad(f.vehiculos)})`);
    lineas.push(`Personas Identificadas: (${cantidad(f.personas)})`);
    lineas.push(`Test de Alómetro: (${cantidad(f.test_alometro)})`);
    lineas.push(`Test de Alcoholímetro: (${cantidad(f.test_alcoholimetro)})`);
    if (numero(f.test_alcoholimetro) > 0) {
      lineas.push(`Positiva Sancionable: (${cantidad(f.positiva_sancionable)})`);
      if (numero(f.positiva_sancionable) > 0) lineas.push(construirLineaGraduaciones(f.graduaciones_sancionable));
      lineas.push(`Positiva no Sancionable: (${cantidad(f.positiva_no_sancionable)})`);
      if (numero(f.positiva_no_sancionable) > 0) lineas.push(construirLineaGraduaciones(f.graduaciones_no_sancionable));
    }
    lineas.push(`Actas Labradas: (${cantidad(f.actas)})`);
    if (esOperativoPatrullaje(operativo, finalizado?.tipo_operativo) && numero(f.decreto_460_22) > 0) {
      lineas.push(`Decto. 460/22: (${cantidad(f.decreto_460_22)})`);
    }
    lineas.push(`Requisas: (${cantidad(f.requisas)})`);
    lineas.push(...construirBloqueListaVertical("Qrz", f.qrz, f.qrz_documentos));
    lineas.push(...construirBloqueListaVertical("Dominio", f.dominio, f.dominio_items));

    const medidas = [
      ["Remisión", f.remision],
      ["Retención", f.retencion],
      ["Prohibición de Circulación", f.prohibicion_circulacion],
      ["Cesión de Conducción", f.cesion_conduccion]
    ].filter(([, valor]) => numero(valor) > 0);

    if (medidas.length) {
      lineas.push("Medidas Cautelares:");
      medidas.forEach(([etiqueta, valor]) => lineas.push(`${etiqueta}: (${cantidad(valor)})`));
    }

    const textoNumerales = texto(numerales.texto || f.numerales);
    if (f.ver_items && textoNumerales) {
      lineas.push("");
      lineas.push(negrita("Items:"));
      lineas.push(textoNumerales);
    }

    if (texto(f.detalles)) {
      lineas.push("");
      lineas.push(negrita("Detalles:"));
      lineas.push(texto(f.detalles));
    }
  }

  lineas.push("");
  lineas.push(negrita("Observaciones:"));
  lineas.push(construirObservacionesFinalizado({
    observaciones: f.observaciones,
    decreto460: f.decreto_460_22,
    esPatrullaje: esOperativoPatrullaje(operativo, finalizado?.tipo_operativo)
  }));

  return compactarSaltos(lineas.join("\n"));
}

function construirObservacionesFinalizado({ observaciones, decreto460, esPatrullaje }) {
  const partes = [];
  const manual = texto(observaciones);
  const cantidadDecreto = Math.max(0, Math.trunc(numero(decreto460)));

  if (manual) partes.push(manual);

  if (esPatrullaje && cantidadDecreto > 0) {
    partes.push(`Se remitieron ${cantidad(cantidadDecreto)} Motovehiculos al Corralon de San Jose del Rincon por Decto 460/22.`);
  }

  return partes.length ? partes.join("\n") : "Sin novedad";
}

function construirLineaGraduaciones(valores) {
  const lista = array(valores).filter(Boolean);
  return `Graduaciones: ${lista.map((v) => `(${v})`).join(" ")} g/l`;
}
function construirBloqueListaVertical(titulo, total, valores) {
  const lineas = [`${titulo}: (${cantidad(total)})`];
  const lista = array(valores).filter(Boolean);
  if (lista.length) lineas.push(...lista);
  return lineas;
}
function array(valor) {
  if (Array.isArray(valor)) return valor.map((v) => String(v || "").trim());
  try { const p = JSON.parse(String(valor || "[]")); return Array.isArray(p) ? p.map((v) => String(v || "").trim()) : []; } catch { return []; }
}

function resolverTituloOperativo(finalizado, operativo) {
  const fuente = operativo?.tipo_nombre || operativo?.titulo || operativo?.tipo_descripcion || finalizado?.tipo_operativo || "Operativo";
  const limpio = String(fuente || "Operativo").replaceAll("_", " ").replace(/\s+/g, " ").trim().toLowerCase();
  return normalizarAcronimosTitulo(limpio.replace(/\b\p{L}/gu, (letra) => letra.toUpperCase()));
}
function normalizarAcronimosTitulo(valor) {
  return String(valor || "")
    .replace(/\bOcv\b/g, "OCV")
    .replace(/\bDicep\b/g, "DICEP")
    .replace(/O\.s\./g, "O.S.")
    .replace(/G\.p\b/g, "G.P");
}
function formatearFecha(valor) {
  const limpio = String(valor || "").trim();
  const fechaISO = limpio.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  // Evita que una fecha DATE de Supabase cambie de día por conversión UTC/local.
  if (fechaISO) {
    return `${fechaISO[3]}/${fechaISO[2]}/${fechaISO[1]}`;
  }

  const fecha = limpio ? new Date(limpio) : new Date();
  const valida = Number.isFinite(fecha.getTime()) ? fecha : new Date();
  return valida.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatearHorario(finalizado) { return `${texto(finalizado?.hora_inicio) || "--:--"} A ${texto(finalizado?.hora_fin) || "--:--"} HS`; }
function normalizarLugar(valor) {
  const limpio = texto(valor); if (!limpio) return "/";
  return limpio.toLowerCase().replace(/\b\p{L}/gu, (letra) => letra.toUpperCase()).replace(/\bRn\b/g, "RN").replace(/\bRp\b/g, "RP").replace(/\bKm\b/g, "KM");
}
function construirElementosVacios() { return ["Escopetas: /", "Ht: /", "Pda: /", "Impresoras: /", "Alómetros: /", "Alcoholímetros: /"] .join("\n"); }
function cantidad(valor) { return String(Math.max(0, Math.trunc(numero(valor)))).padStart(2, "0"); }
function numero(valor) { const n = Number(valor || 0); return Number.isFinite(n) ? n : 0; }
function negrita(valor) { return `*${texto(valor)}*`; }
function texto(valor) { return String(valor || "").trim(); }
function compactarSaltos(valor) { return String(valor || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim(); }
