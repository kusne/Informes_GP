// Salida institucional encapsulada: PROCEDIMIENTO
import { extraerCodigosFalta, getNomencladorFalta } from "../../../finaliza/numerales/nomenclador.js";
import { resolverOrdenesOrigenOperativo, resolverTipoNombreOperativo } from "../../../compartido/operativo-identidad.js";
import { interpretarLicenciaDniAlcoholemia } from "../../licencia-dni-alcoholemia.js";
import { formatearTituloOperativo } from "../../../compartido/texto/formato-titulos-operativos.js";
import { resolverLugarProcedimiento46022 } from "../../../compartido/lugares/lugar-procedimiento-460-22.js";

const ENCABEZADO_INFORMES = "*POLICÍA DE LA PROVINCIA DE SANTA FE- DIRECCION GENERAL GUARDIA PROVINCIAL - BRIGADA MOTORIZADA ZONA CENTRO NORTE*";

function compactarSaltos(valor) {
  return String(valor || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function texto(valor) {
  return String(valor || "").trim();
}

function construirProcedimiento(informe) {
    const f=informe.formulario||{};
    const hecho=texto(f.hecho).toUpperCase();
    const fecha=texto(f.fecha_hecho);
    const dia=/^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
    return compactarSaltos([
      "*POLICÍA DE LA PROVINCIA DE SANTA FE - GUARDIA PROVINCIAL*",
      "*BRIGADA MOTORIZADA ZONA CENTRO NORTE SANTA FE*",
      "*TERCIO CHARLIE*", "",
      `*HECHO: ${hecho}*`, "",
      `*LUGAR:* ${texto(f.lugar_hecho)}`, "",
      `*FECHA:* ${dia?dia[3]+"/"+dia[2]+"/"+dia[1]:fecha}`,
      `*HORARIO:* ${texto(f.hora_hecho)}hs`, "",
      "*PERSONAL POLICIAL:*", texto(f.personal), "",
      `*MÓVIL/ES:* ${texto(f.moviles)}`, "",
      `*OBSERVACIONES:* ${texto(f.observaciones)}`
    ].join("\n"));
}

export { construirProcedimiento as construirInforme };
