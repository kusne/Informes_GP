// Validación encapsulada: ALCOHOLEMIA_POSITIVA
import { extraerCodigosFalta, getNomencladorFalta } from "../../../finaliza/numerales/nomenclador.js";
import { interpretarLicenciaDniAlcoholemia } from "../../licencia-dni-alcoholemia.js";
import { resolverLugarProcedimiento46022 } from "../../../compartido/lugares/lugar-procedimiento-460-22.js";

function validarAlcoholemia(informe, errores) {
  const f = informe.formulario || {};
  const c = informe.calculos || {};

  if (!texto(f.tipo_vehiculo)) errores.push("Debe seleccionar tipo de vehículo.");
  if (!texto(f.marca)) errores.push("Debe completar marca.");
  if (!texto(f.modelo_vehiculo)) errores.push("Debe completar modelo.");
  if (!texto(f.conductor)) errores.push("Debe completar conductor.");
  if (!texto(f.clase)) errores.push("Debe completar Licencia Clase / DNI.");
  else if (!interpretarLicenciaDniAlcoholemia(f.clase).valido) {
    errores.push("Ingresá una o varias clases válidas (ej. A1.3, B2 y G3 27762328) o un DNI de ocho números.");
  }
  if (f.licencia_digital && interpretarLicenciaDniAlcoholemia(f.clase).tipo === "DNI") {
    errores.push("Una licencia digital requiere indicar su clase al inicio del campo.");
  }

  const resultado = parsearDecimal(f.resultado);
  if (!Number.isFinite(resultado) || resultado <= 0) {
    errores.push("Debe completar graduación de alcoholemia mayor a 0.");
  }

  // Para una alcoholemia sancionable el formato institucional necesita acta.
  if (Boolean(c.sancionable) && !texto(f.numero_acta)) {
    errores.push("Debe completar N° de acta para una alcoholemia sancionable.");
  }

  validarJuzgadoRetencion(f, errores, Boolean(f.medida_retencion));

  const otrosCodigosTexto = texto(f.otros_codigos);
  if (otrosCodigosTexto) {
    const codigos = extraerCodigosFalta(otrosCodigosTexto);
    if (!codigos.length) {
      errores.push("Otros códigos debe contener códigos numéricos válidos.");
    } else {
      const invalidos = codigos.filter((codigo) => !getNomencladorFalta(codigo));
      if (invalidos.length) {
        errores.push(`Código/s no encontrado/s en nomenclador: ${invalidos.join(", ")}.`);
      }
    }
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

function parsearDecimal(valor) {
  const limpio = String(valor ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");

  if (!limpio) return NaN;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : NaN;
}

function texto(valor) {
  return String(valor || "").trim();
}

export { validarAlcoholemia as validarModelo };
