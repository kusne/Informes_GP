// Validación encapsulada: DECRETO_460_22
import { extraerCodigosFalta, getNomencladorFalta } from "../../../finaliza/numerales/nomenclador.js";
import { interpretarLicenciaDniAlcoholemia } from "../../licencia-dni-alcoholemia.js";
import { resolverLugarProcedimiento46022 } from "../../../compartido/lugares/lugar-procedimiento-460-22.js";

function validarDecreto46022(informe, errores) {
  const f = informe.formulario || {};

  // La ubicación del procedimiento sólo puede heredarse de un QTH puntual.
  // Si el operativo es patrullaje o cubre un rango, se exige el QTH exacto.
  const lugar = resolverLugarProcedimiento46022(informe);
  if (!lugar.lugar) {
    errores.push(lugar.requiereManual
      ? "Completá el lugar exacto del procedimiento 460/22."
      : "El operativo seleccionado no tiene un QTH fijo.");
  }

  // Conductor y DNI son datos opcionales: el formato institucional 460/22 no
  // los imprime como campos independientes. Sí son obligatorios los datos que
  // integran el relato del procedimiento.
  if (!texto(f.marca)) errores.push("Debe completar la marca de la motocicleta.");
  if (!texto(f.modelo_vehiculo)) errores.push("Debe completar el modelo de la motocicleta.");
  if (!texto(f.dominio)) errores.push("Debe completar dominio.");
  if (!texto(f.numero_acta)) errores.push("Debe completar el N.º de acta de infracción.");
  validarJuzgadoRetencion(f, errores, true);

  const codigos = extraerCodigosFalta(f.codigos_infraccion);
  if (!codigos.length) {
    errores.push("Debe ingresar al menos un código de infracción del nomenclador.");
    return;
  }

  const invalidos = codigos.filter((codigo) => !getNomencladorFalta(codigo));
  if (invalidos.length) {
    errores.push(`Código/s no encontrado/s en nomenclador: ${invalidos.join(", ")}.`);
  }
}

function validarJuzgadoRetencion(f, errores, habilitado) {
  if (!habilitado) return;
  const elegido = texto(f.juzgado || "SANTA FE").toLocaleUpperCase("es-AR");
  const opciones = ["SANTA FE", "RINCON", "RECREO", "SAUCE VIEJO", "SANTO TOME", "OTRO"];
  if (!opciones.includes(elegido)) {
    errores.push("Seleccione un juzgado válido.");
  } else if (elegido === "OTRO" && !texto(f.juzgado_otro)) {
    errores.push("Complete el nombre del juzgado al seleccionar OTRO.");
  }
}

function texto(valor) {
  return String(valor || "").trim();
}

export { validarDecreto46022 as validarModelo };
