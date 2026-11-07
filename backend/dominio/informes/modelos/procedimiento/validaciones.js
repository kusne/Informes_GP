// Validación encapsulada: PROCEDIMIENTO
import { extraerCodigosFalta, getNomencladorFalta } from "../../../finaliza/numerales/nomenclador.js";
import { interpretarLicenciaDniAlcoholemia } from "../../licencia-dni-alcoholemia.js";
import { resolverLugarProcedimiento46022 } from "../../../compartido/lugares/lugar-procedimiento-460-22.js";

function texto(valor) {
  return String(valor || "").trim();
}

function validarProcedimiento(informe, errores) {
    const f=informe.formulario||{};
    if(!/^PROCEDIMIENTO\b/i.test(texto(f.hecho))) errores.push("HECHO debe comenzar con PROCEDIMIENTO.");
    if(texto(f.hecho).replace(/^PROCEDIMIENTO\s*(?:POR\s*)?/i,'').length<4) errores.push("Completá el motivo del procedimiento.");
    if(!texto(f.lugar_hecho)) errores.push("Ingresá el lugar donde ocurre el procedimiento.");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(texto(f.fecha_hecho))) errores.push("Fecha del procedimiento inválida.");
    if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(texto(f.hora_hecho))) errores.push("Hora real del procedimiento inválida.");
    if(!texto(f.personal)) errores.push("Completá el personal policial interviniente.");
    if(!texto(f.moviles)) errores.push("Completá los móviles.");
    if(!texto(f.observaciones)) errores.push("Completá el relato de observaciones.");
}

export { validarProcedimiento as validarModelo };
