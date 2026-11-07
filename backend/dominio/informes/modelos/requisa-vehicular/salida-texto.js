// Salida institucional encapsulada: REQUISA_VEHICULAR
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

function construirRequisaVehicular(informe) {
  const f = informe.formulario || {};
  const recursos = resolverRecursosOperativoInforme(informe);
  const lugar = primerTexto(f.lugar_hecho, informe.lugar) || "/";
  const fecha = resolverFechaInformeDocumento(
    { ...informe, fecha_informe: primerTexto(f.fecha_hecho, informe.fecha_informe) },
    true
  );
  const horario = primerTexto(f.hora_hecho, resolverHoraInforme(informe)) || "--:--";
  const personal = normalizarPersonalRequisa(primerTexto(f.personal, recursos.personal)) || "/";
  const moviles = normalizarMovilesRequisa(primerTexto(f.moviles, recursos.moviles)) || "/";
  const tipoVehiculo = formatearTipoVehiculoRequisa(f.tipo_vehiculo);
  const dominio = mayusculasDocumento(f.dominio) || "/";
  const genero = texto(f.genero).toUpperCase();
  const sujeto = genero === "FEMENINO" ? "una femenina mayor de edad" : "un masculino mayor de edad";
  const pronombre = genero === "FEMENINO" ? "la" : "lo";

  const relato = [
    `en momentos en que nos encontrábamos cumplimentando operativo de control vehicular, detenemos la marcha de un vehículo *Tipo* ${tipoVehiculo}, *Dominio* ${dominio} conducido por ${sujeto},`,
    "se fiscaliza documentación y se consulta preventivamente por sistema por impedimentos legales del vehículo y su/s ocupantes, arrojando sin novedad,",
    `también se ${pronombre} invita a que nos permita realizar una inspección ocular del interior del vehículo para descartar que no transporte algún elemento ilegal, accediendo sin reparo alguno, resultando sin novedad.`,
    "Por lo que una vez constatado que todo está en regla sigue su marcha"
  ].join(" ");

  const lineas = [
    "*POLICIA DE LA PROVINCIA DE SANTA FE -DIRECCION GENERAL GUARDIA PROVINCIAL-BRIGADA MOTORIZADA ZONA CENTRO NORTE*",
    "",
    "*MOTIVO*: Requisa de vehiculo voluntaria",
    "",
    "*PERSONAL:*",
    personal,
    "",
    `*MOVIL* ${moviles}`,
    `*LUGAR*: ${lugar}`,
    `*FECHA* ${fecha} -  ${horario} hs`,
    "",
    `*REQUISA VOLUNTARIA:* ${relato}`,
    "",
    "*Se adjunta vista fotográfica.*"
  ];

  return compactarSaltos(lineas.join("\n"));
}

function normalizarPersonalRequisa(valor) {
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

function normalizarMovilesRequisa(valor) {
  return texto(valor)
    .split(/[\n,;]+|\s+\/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join("/");
}

function formatearTipoVehiculoRequisa(valor) {
  const limpio = texto(valor).replaceAll("_", " ").replace(/\s+/g, " ").trim();
  return limpio ? limpio.toLocaleUpperCase("es-AR") : "VEHÍCULO";
}

function texto(valor) {
  return String(valor || "").trim();
}

function mayusculasDocumento(valor) {
  return texto(valor).toLocaleUpperCase("es-AR");
}

export { construirRequisaVehicular as construirInforme };
