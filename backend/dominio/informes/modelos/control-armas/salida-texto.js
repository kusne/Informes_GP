// Salida institucional encapsulada: CONTROL_ARMAS
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

function construirControlArmas(informe) {
  const f = informe.formulario || {};
  const recursos = resolverRecursosOperativoInforme(informe);
  const personal = normalizarPersonalControlArmas(primerTexto(f.personal, recursos.personal));
  const moviles = primerTexto(f.moviles, recursos.moviles);
  const lugar = primerTexto(f.lugar_hecho, informe.lugar);
  const fechaHora = construirFechaHora(f.fecha_hecho, f.hora_hecho);

  const lineas = [
    "*POLICIA DE LA PROVINCIA DE SANTA FE -DIRECCION GENERAL GUARDIA PROVINCIAL-BRIGADA MOTORIZADA CENTRO NORTE TERCIO CHARLIE(SANTA FE )*",
    "",
    "*HECHO*: Requisa Vehicular y Transporte de armas de fuego",
    "",
    "*PERSONAL:*",
    personal || "/",
    "",
    `*MOVIL* ${moviles || "/"}`,
    `*LUGAR*: ${lugar || "/"}`,
    `*FECHA* ${fechaHora || "/"}`,
    "",
    `*CONTROL DE ARMAMENTO:* ${construirRelatoControlArmas(f)}`
  ];


  return compactarSaltos(lineas.join("\n"));
}

function construirRelatoControlArmas(f = {}) {
  const tipo = mayusculasDocumento(texto(f.tipo_vehiculo).replaceAll("_", " ").replace(/\s+/g, " ")) || "VEHÍCULO";
  const conductor = texto(f.conductor).toLocaleUpperCase("es-AR");
  const cantidad = Number(f.cantidad_armas || 0);
  const tipoArma = tituloControlArmas(f.tipo_arma) || "arma de fuego";
  const documentacion = texto(f.documentacion_armas).toLocaleUpperCase("es-AR");
  const resultado = texto(f.resultado_procedimiento).toLocaleUpperCase("es-AR");
  const detalle = documentacion !== "SIN NOVEDAD"
    ? texto(f.detalle_armas).toLocaleUpperCase("es-AR")
    : "";
  const observaciones = texto(f.observaciones).toLocaleUpperCase("es-AR");

  const cantidadFormateada = cantidad > 0 ? `(${String(Math.trunc(cantidad)).padStart(2, "0")})` : "(00)";
  const sujetoConductor = conductor || "UN MASCULINO MAYOR DE EDAD";

  const partes = [
    `en momentos en que nos encontrábamos cumplimentando operativo de control vehicular, detenemos la marcha de un vehículo *Tipo* ${tipo}, conducido por ${sujetoConductor}, se fiscaliza la documentación y preventivamente se consulta los datos del vehículo y ocupante/s resultando sin novedad. Acto se lo invita, nos permita realizar una inspección ocular del interior del vehículo para descartar que no transporte algún elemento ilegal, accediendo sin reparo alguno, observando en el interior del vehiculo ${cantidadFormateada} armas de fuego, siendo ${cantidadFormateada} ${tipoArma}.`
  ];

  if (detalle) {
    partes.push(`Detalle del armamento: ${detalle}.`);
  }

  if (documentacion === "SIN NOVEDAD") {
    partes.push("Se le solicita documentacion resultando sin novedad.");
  } else if (documentacion) {
    partes.push(`Se le solicita documentacion del armamento, resultando ${documentacion.toLocaleLowerCase("es-AR")}.`);
  }

  if (resultado === "CONTINÚA SU MARCHA") {
    partes.push("Por lo que una vez constatado que todo está en regla sigue su marcha.");
  } else if (resultado === "SE ADOPTAN MEDIDAS") {
    partes.push("Por lo que se adoptan las medidas correspondientes conforme a las circunstancias del procedimiento.");
  }

  if (observaciones) partes.push(observaciones);

  return partes.join(" ");
}

function normalizarPersonalControlArmas(valor) {
  return texto(valor)
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => {
      const clave = linea.toUpperCase();
      if (clave === "SUBJEFE") return "Sub Jefe de dependencia Inspector Fertonani";
      if (clave === "JEFE") return "Jefe de dependencia SubCrio. Choque J.M.";
      return linea;
    })
    .join("\n");
}

function tituloControlArmas(valor) {
  const limpio = texto(valor).replaceAll("_", " ").replace(/\s+/g, " ").trim();
  if (!limpio) return "";

  return limpio
    .toLocaleLowerCase("es-AR")
    .replace(/(^|[\s/-])\p{L}/gu, (coincidencia) => coincidencia.toLocaleUpperCase("es-AR"));
}

function construirFechaHora(fecha, hora) {
  const f = formatearFechaDocumento(fecha);
  const h = texto(hora);
  if (f && h) return `${f} - ${h} hs`;
  return f || (h ? `${h} hs` : "");
}

function formatearFechaDocumento(valor) {
  const v = texto(valor);
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

function texto(valor) {
  return String(valor || "").trim();
}

function mayusculasDocumento(valor) {
  return texto(valor).toLocaleUpperCase("es-AR");
}

export { construirControlArmas as construirInforme };
