// Salida institucional encapsulada: DECRETO_460_22
import { extraerCodigosFalta, getNomencladorFalta } from "../../../finaliza/numerales/nomenclador.js";
import { resolverOrdenesOrigenOperativo, resolverTipoNombreOperativo } from "../../../compartido/operativo-identidad.js";
import { interpretarLicenciaDniAlcoholemia } from "../../licencia-dni-alcoholemia.js";
import { formatearTituloOperativo } from "../../../compartido/texto/formato-titulos-operativos.js";
import { resolverLugarProcedimiento46022 } from "../../../compartido/lugares/lugar-procedimiento-460-22.js";

const ENCABEZADO_INFORMES = "*POLICÍA DE LA PROVINCIA DE SANTA FE- DIRECCION GENERAL GUARDIA PROVINCIAL - BRIGADA MOTORIZADA ZONA CENTRO NORTE*";

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

function normalizarNumeroActa(valor) {
  return texto(valor)
    .replace(/^N(?:RO|º|°)?\s*/i, "")
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

function construirDecreto46022(informe) {
  const f = informe.formulario || {};
  const recursos = resolverRecursosOperativoInforme(informe);
  const codigos = extraerCodigosFalta(f.codigos_infraccion);
  const marca = texto(f.marca);
  const modelo = mayusculasDocumento(f.modelo_vehiculo);
  const dominio = mayusculasDocumento(f.dominio);
  const numeroActa = normalizarNumeroActa(f.numero_acta);
  const operativoCumplimentado = construirDescripcionOperativo(informe, { mayusculas: true });

  const observacion = [
    `Realizando ${operativoCumplimentado} procedemos a la detención en zona segura de un MOTOVEHÍCULO marca ${marca} modelo ${modelo}, dominio ${dominio}, labrándose acta de infracción N° ${numeroActa} por el código/s ${codigos.join(", ")}, remitiendo el birrodado al corralón de San José del Rincón.`,
    "Labrando acta de inventario.",
    "Cabe destacar que se realizó consulta sobre el vehículo y persona por posibles requerimientos legales vigentes, con resultados negativos."
  ].join(" ");

  const lineas = [
    "*POLICÍA DE LA PROVINCIA DE SANTA FE - DIRECCIÓN GENERAL GUARDIA PROVINCIAL*",
    "*BRIGADA MOTORIZADA ZONA CENTRO NORTE SANTA FE*",
    "*TERCIO CHARLIE*",
    "",
    "*MOTIVO: REMISIÓN DE MOTOCICLETA POR DECRETO 460/22*",
    "",
    `*LUGAR:* ${resolverLugarProcedimiento46022(informe).lugar || "/"}`,
    `*HORA:* ${resolverHoraInforme(informe)} Hs`,
    `*FECHA:* ${resolverFechaInformeDocumento(informe, true)}`,
    "",
    `*MÓVIL:* ${recursos.moviles || "/"}`,
    "",
    "*PERSONAL*",
    normalizarPersonalInstitucional(recursos.personal) || "/",
    "",
    `*OBSERVACIÓN:* ${observacion}`
  ];

  return compactarSaltos(lineas.join("\n"));
}

function texto(valor) {
  return String(valor || "").trim();
}

function mayusculasDocumento(valor) {
  return texto(valor).toLocaleUpperCase("es-AR");
}

export { construirDecreto46022 as construirInforme };
