// Salida institucional encapsulada: CONTROL_SUPERIOR
import { extraerCodigosFalta, getNomencladorFalta } from "../../../finaliza/numerales/nomenclador.js";
import { resolverOrdenesOrigenOperativo, resolverTipoNombreOperativo } from "../../../compartido/operativo-identidad.js";
import { interpretarLicenciaDniAlcoholemia } from "../../licencia-dni-alcoholemia.js";
import { formatearTituloOperativo } from "../../../compartido/texto/formato-titulos-operativos.js";
import { resolverLugarProcedimiento46022 } from "../../../compartido/lugares/lugar-procedimiento-460-22.js";

const ENCABEZADO_INFORMES = "*POLICÍA DE LA PROVINCIA DE SANTA FE- DIRECCION GENERAL GUARDIA PROVINCIAL - BRIGADA MOTORIZADA ZONA CENTRO NORTE*";

function construirControlSuperior(informe) {
  const f = informe.formulario || {};
  const recursos = resolverRecursosOperativoInforme(informe);
  const lineas = [
    "*POLICÍA DE LA PROVINCIA DE SANTA FE - GUARDIA PROVINCIAL*",
    "*BRIGADA MOTORIZADA ZONA CENTRO NORTE SANTA FE*",
    "*TERCIO CHARLIE*",
    "",
    "*MOTIVO: CONTROL SUPERIOR*",
    "",
    `*LUGAR:* ${texto(informe.lugar) || "/"}`,
    `*HORA:* ${resolverHoraInforme(informe)} Hs`,
    `*FECHA:* ${resolverFechaInformeDocumento(informe, false)}`,
    "",
    `*OPERATIVO:* ${construirDescripcionOperativo(informe)}`,
    "",
    "*PERSONAL POLICIAL:*",
    normalizarPersonalInstitucional(recursos.personal) || "/",
    "",
    `*MÓVIL/ES:* ${recursos.moviles || "/"}`,
    "",
    `*OBSERVACIONES:* ${construirObservacionControlSuperior(f)}`
  ];

  return compactarSaltos(lineas.join("\n"));
}

function construirMovilesControlSuperior(f = {}) {
  const moviles = [];
  if (Boolean(f.movil_12428)) moviles.push("12428");
  if (Boolean(f.movil_otro)) {
    const otros = texto(f.moviles_otros)
      .split(/[\s,;/]+/)
      .map((v) => v.trim())
      .filter(Boolean);
    for (const movil of otros) {
      if (!moviles.includes(movil)) moviles.push(movil);
    }
  }
  return moviles.join("/");
}

function construirObservacionControlSuperior(f = {}) {
  const autoridades = [];
  if (Boolean(f.autoridad_jefe)) autoridades.push("JEFE SubCrio. Choque J.M.");
  if (Boolean(f.autoridad_subjefe)) autoridades.push("SUBJEFE Inspector Fertonani Sebastian");
  if (Boolean(f.autoridad_otros) && texto(f.nombre_autoridad)) autoridades.push(texto(f.nombre_autoridad));

  const moviles = construirMovilesControlSuperior(f);
  const plural = autoridades.length > 1;
  const sujeto = unirConY(autoridades) || "la autoridad superior";
  const movilidad = moviles
    ? `${plural || moviles.includes("/") ? " con móvil/es " : " con móvil "}${moviles}`
    : "";

  const base = `${plural ? "Se hacen presentes" : "Se hace presente"} ${sujeto}${movilidad} realizando control superior`;
  const seAcopla = f.se_acopla !== false;

  return seAcopla
    ? `${base} y ${plural ? "se acoplan" : "se acopla"} al operativo.`
    : `${base}. Acto seguido se retira sin novedad.`;
}

function resolverRecursosOperativoInforme(informe = {}) {
  const operativo = informe?.operativo || {};
  const datos = objeto(operativo?.datos);
  const snapshot = objeto(datos?.inicio_snapshot);

  return {
    personal: primerTexto(
      snapshot.personal,
      operativo.personal,
      operativo.personal_inicio,
      datos.personal_inicio,
      datos.personal
    ),
    moviles: primerTexto(
      snapshot.moviles_motos,
      operativo.moviles_motos,
      datos.moviles_motos,
      datos.movilidad,
      unirMovilidad(datos.moviles, datos.motos)
    )
  };
}

function construirDescripcionOperativo(informe = {}, { mayusculas = false } = {}) {
  const operativo = informe?.operativo || {};
  const tipoFuente = resolverTipoNombreOperativo(informe, operativo);
  const tipo = mayusculas
    ? texto(tipoFuente).replaceAll("_", " ").replace(/\s+/g, " ").toUpperCase()
    : tituloDocumento(tipoFuente);

  const numerosEnTipo = new Set(extraerNumerosOrden(tipoFuente));
  const ordenes = resolverOrdenesOrigenOperativo(informe, operativo)
    .map(normalizarOrdenDocumento)
    .filter(Boolean)
    .filter((orden) => {
      const numeros = extraerNumerosOrden(orden);
      return !numeros.length || numeros.some((numero) => !numerosEnTipo.has(numero));
    });

  if (!ordenes.length) return tipo || "OPERATIVO";
  return `${tipo || "OPERATIVO"} ${ordenes.join(" / ")}`.trim();
}

function resolverHoraInforme(informe = {}) {
  const directa = texto(informe.hora_informe);
  if (/^\d{1,2}:\d{2}$/.test(directa)) return directa;

  const fecha = new Date(informe.fecha || Date.now());
  if (!Number.isNaN(fecha.getTime())) {
    return `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
  }

  return "--:--";
}

function resolverFechaInformeDocumento(informe = {}, rellenar = true) {
  const candidata = primerTexto(informe.fecha_informe, informe.formulario?.fecha_hecho, informe.fecha);
  let m = candidata.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const dia = rellenar ? m[3].padStart(2, "0") : String(Number(m[3]));
    const mes = rellenar ? m[2].padStart(2, "0") : String(Number(m[2]));
    return `${dia}/${mes}/${m[1]}`;
  }

  m = candidata.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dia = rellenar ? m[1].padStart(2, "0") : String(Number(m[1]));
    const mes = rellenar ? m[2].padStart(2, "0") : String(Number(m[2]));
    return `${dia}/${mes}/${m[3]}`;
  }

  const fecha = new Date(candidata || Date.now());
  const valida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  const dia = rellenar ? String(valida.getDate()).padStart(2, "0") : String(valida.getDate());
  const mes = rellenar ? String(valida.getMonth() + 1).padStart(2, "0") : String(valida.getMonth() + 1);
  return `${dia}/${mes}/${valida.getFullYear()}`;
}

function normalizarPersonalInstitucional(valor) {
  const equivalencias = {
    JEFE: "JEFE SubCrio. Choque J.M.",
    SUBJEFE: "SUBJEFE Inspector Fertonani S."
  };

  return texto(valor)
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => equivalencias[linea.toUpperCase()] || linea)
    .join("\n");
}

function tituloDocumento(valor) {
  return formatearTituloOperativo(valor);
}

function normalizarOrdenDocumento(valor) {
  return texto(valor)
    .replace(/\s*\/\s*/g, "/")
    .replace(/\bN(?:RO|º|°)?\s*(?=\d)/gi, "N°")
    .replace(/\s+/g, " ")
    .trim();
}

function extraerNumerosOrden(valor) {
  return (texto(valor).match(/\b\d{1,6}\s*\/\s*\d{2,4}\b/g) || [])
    .map((item) => item.replace(/\s+/g, ""));
}

function unirMovilidad(moviles, motos) {
  const lista = [];
  for (const valor of [moviles, motos]) {
    if (Array.isArray(valor)) lista.push(...valor.map(texto).filter(Boolean));
    else if (texto(valor)) lista.push(texto(valor));
  }
  return lista.join(" / ");
}

function unirConY(items = []) {
  const lista = items.map(texto).filter(Boolean);
  if (lista.length <= 1) return lista[0] || "";
  if (lista.length === 2) return `${lista[0]} y ${lista[1]}`;
  return `${lista.slice(0, -1).join(", ")} y ${lista.at(-1)}`;
}

function objeto(valor) {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};
}

function primerTexto(...valores) {
  for (const valor of valores) {
    const limpio = texto(valor);
    if (limpio && limpio !== "[object Object]") return limpio;
  }
  return "";
}

function compactarSaltos(valor) {
  return String(valor || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function texto(valor) {
  return String(valor || "").trim();
}

export { construirControlSuperior as construirInforme };
