// Validación encapsulada: CONTROL_SUPERIOR
import { extraerCodigosFalta, getNomencladorFalta } from "../../../finaliza/numerales/nomenclador.js";
import { interpretarLicenciaDniAlcoholemia } from "../../licencia-dni-alcoholemia.js";
import { resolverLugarProcedimiento46022 } from "../../../compartido/lugares/lugar-procedimiento-460-22.js";

function validarControlSuperior(informe, errores) {
  const f = informe.formulario || {};
  const hayAutoridad = Boolean(f.autoridad_jefe || f.autoridad_subjefe || f.autoridad_otros);

  if (!hayAutoridad) errores.push("Debe tildar al menos una autoridad de Control Superior.");
  if (Boolean(f.autoridad_otros) && !texto(f.nombre_autoridad)) {
    errores.push("Si selecciona Otros, debe completar nombre/cargo de la autoridad.");
  }
  if (Boolean(f.movil_otro) && !texto(f.moviles_otros)) {
    errores.push("Si selecciona Otro móvil, debe completar el/los número/s.");
  }
}

function texto(valor) {
  return String(valor || "").trim();
}

export { validarControlSuperior as validarModelo };
