import test from "node:test";
import assert from "node:assert/strict";
import { construirTextoInformeEspecial } from "../backend/dominio/informes/informe-especial-salida-texto.js";

function informeDePrueba() {
  return {
    modelo: "DECRETO_460_22",
    lugar: "RN 168 KM 7,5",
    fecha_informe: "2026-10-21",
    hora_informe: "11:22",
    operativo: {
      tipo_nombre: "PATRULLAJE",
      datos: {
        ordenes_origen: ["O.S. G.P N°2067/26"],
        inicio_snapshot: {
          personal: "Subinspector Mariaux Alejandra Anahi",
          moviles_motos: "10139"
        }
      }
    },
    formulario: {
      marca: "Motomel",
      modelo_vehiculo: "SII",
      dominio: "A150DYY",
      numero_acta: "070022956",
      codigos_infraccion: "9119, 4084",
      juzgado: "RINCON"
    }
  };
}

test("460/22 imprime la observación institucional con tildes, requerimientos y todos los datos", () => {
  const salida = construirTextoInformeEspecial(informeDePrueba());
  const observacion = "*OBSERVACIÓN:* Realizando PATRULLAJE O.S. G.P N°2067/26 procedemos a la detención en zona segura de un MOTOVEHÍCULO marca Motomel modelo SII, dominio A150DYY, labrándose acta de infracción N° 070022956 por el código/s 9119, 4084, remitiendo el birrodado al corralón de San José del Rincón. Labrando acta de inventario. Cabe destacar que se realizó consulta sobre el vehículo y persona por posibles requerimientos legales vigentes, con resultados negativos.";
  assert.ok(salida.includes(observacion), "La OBSERVACIÓN debe coincidir exactamente con el texto solicitado");
  assert.match(salida, /\*POLICÍA DE LA PROVINCIA DE SANTA FE - DIRECCIÓN GENERAL GUARDIA PROVINCIAL\*/);
  assert.match(salida, /\*MOTIVO: REMISIÓN DE MOTOCICLETA POR DECRETO 460\/22\*/);
  assert.doesNotMatch(salida, /\bDECTO\b|\brequirimientos\b|\bSan Jose del Rincon\b/i);
});

test("460/22 no agrega JUZGADO al final incluso si se eligió un juzgado en el formulario", () => {
  const salida = construirTextoInformeEspecial(informeDePrueba());
  assert.doesNotMatch(salida, /\*JUZGADO:\*/);
  assert.ok(salida.endsWith("con resultados negativos."));
  assert.equal((salida.match(/\*OBSERVACIÓN:\*/g) || []).length, 1);
});

test("No altera el informe de alcoholemia con retención, que sí mantiene JUZGADO", () => {
  const fuente = construirTextoInformeEspecial.toString();
  assert.ok(fuente.includes("construirAlcoholemia"));
  // La función 460/22 no debe borrar ni modificar el selector compartido de juzgados.
  assert.equal(informeDePrueba().formulario.juzgado, "RINCON");
});
