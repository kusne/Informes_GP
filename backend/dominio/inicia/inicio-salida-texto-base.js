import { anexarOrdenesAlTitulo, resolverOrdenesOrigenOperativo } from "../compartido/operativo-identidad.js";
export function construirTextoInicioBase(inicio) {
  if (!inicio) return "";

  const formulario = inicio.formulario || {};
  const operativo = inicio.operativo || {};
  const lineas = [];

  lineas.push(negrita("Policia de la Provincia de Santa Fe - Direccion General Guardia Provincial"));
  lineas.push(negrita("Brigada Motorizada Centro Norte"));
  lineas.push(negrita("Tercio Charlie"));
  lineas.push("");

  lineas.push(negrita(`Inicia ${resolverTituloOperativo(inicio, operativo)}`.trim()));
  lineas.push("");

  lineas.push(`${negrita("Fecha:")} ${formatearFecha(inicio.fecha_operativo || operativo?.fecha_operativo || inicio.fecha)}`);
  lineas.push(`${negrita("Horario:")} ${formatearHorario(inicio)}`);
  lineas.push(`${negrita("Lugar:")} ${normalizarLugar(inicio.lugar)}`);
  lineas.push("");

  lineas.push(negrita("Personal Policial:"));
  lineas.push(formatearPersonalSalida(formulario.personal) || "/");
  lineas.push("");

  lineas.push(`${negrita("Móviles:")} ${texto(formulario.moviles_motos) || "/"}`);
  lineas.push("");

  lineas.push(negrita("Elementos:"));
  lineas.push(texto(formulario.elementos) || construirElementosVacios());
  lineas.push("");

  lineas.push(negrita("Observaciones:"));
  lineas.push(texto(formulario.observaciones) || "Sin novedad");

  return compactarSaltos(lineas.join("\n"));
}

function formatearPersonalSalida(valor) {
  const equivalencias = {
    JEFE: "JEFE SubCrio. Choque J.M.",
    SUBJEFE: "SUBJEFE Inspector Fertonani S.."
  };

  return texto(valor)
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => equivalencias[linea.toUpperCase()] || linea)
    .join("\n");
}

function resolverTituloOperativo(inicio, operativo) {
  const fuente =
    operativo?.tipo_nombre ||
    operativo?.titulo ||
    operativo?.tipo_descripcion ||
    inicio?.tipo_operativo ||
    "Operativo";

  const titulo = normalizarAcronimosTitulo(tituloLegible(fuente));
  return anexarOrdenesAlTitulo(titulo, resolverOrdenesOrigenOperativo(inicio, operativo));
}

function tituloLegible(valor) {
  const limpio = String(valor || "Operativo")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return limpio.replace(/\b\p{L}/gu, (letra) => letra.toUpperCase());
}

function normalizarAcronimosTitulo(valor) {
  return String(valor || "")
    .replace(/\bOcv\b/g, "OCV")
    .replace(/\bDicep\b/g, "DICEP")
    .replace(/O\.s\./g, "O.S.")
    .replace(/G\.p\b/g, "G.P");
}

function normalizarLugar(valor) {
  const limpio = texto(valor);
  if (!limpio) return "/";

  return limpio
    .toLowerCase()
    .replace(/\b\p{L}/gu, (letra) => letra.toUpperCase())
    .replace(/\bRn\b/g, "RN")
    .replace(/\bRp\b/g, "RP")
    .replace(/\bKm\b/g, "KM");
}

function formatearFecha(valor) {
  const limpio = String(valor || "").trim();
  const fechaISO = limpio.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  // Una fecha DATE de Supabase no debe convertirse con new Date("YYYY-MM-DD"),
  // porque el huso horario puede desplazarla al día anterior.
  if (fechaISO) {
    return `${fechaISO[3]}/${fechaISO[2]}/${fechaISO[1]}`;
  }

  const fecha = limpio ? new Date(limpio) : new Date();
  const valida = Number.isFinite(fecha.getTime()) ? fecha : new Date();

  return valida.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatearHorario(inicio) {
  const horaInicio = texto(inicio?.hora_inicio);
  const horaFin = texto(inicio?.hora_fin);

  if (!horaInicio && !horaFin) return "/";
  return `${horaInicio || "--:--"} A ${horaFin || "--:--"} HS`;
}

function construirElementosVacios() {
  return [
    "Escopetas: /",
    "Ht: /",
    "Pda: /",
    "Impresoras: /",
    "Alómetros: /",
    "Alcoholímetros: /"
  ].join("\n");
}

function negrita(valor) {
  return `*${texto(valor)}*`;
}

function texto(valor) {
  return String(valor || "").trim();
}

function compactarSaltos(valor) {
  return String(valor || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
