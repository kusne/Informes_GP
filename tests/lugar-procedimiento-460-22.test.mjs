import test from "node:test";
import assert from "node:assert/strict";
import {
  esQthDeRecorridoOTramo,
  requiereLugarManual46022,
  resolverLugarProcedimiento46022
} from "../backend/dominio/compartido/lugares/lugar-procedimiento-460-22.js";
import { construirTextoInformeEspecial } from "../backend/dominio/informes/informe-especial-salida-texto.js";
import { validarInformeEspecial } from "../backend/dominio/informes/informe-especial-validaciones.js";
import { readFileSync } from "node:fs";

function informe(operativo, lugarIngresado = "") {
  return {
    modelo: "DECRETO_460_22",
    operativo_key: "prueba-460",
    guardia_fecha: "2026-10-29",
    lugar: operativo.lugar,
    operativo,
    fecha_informe: "2026-10-29",
    hora_informe: "09:18",
    formulario: {
      marca: "Motomel",
      modelo_vehiculo: "SII",
      dominio: "A150DYY",
      numero_acta: "070022956",
      codigos_infraccion: "9119",
      juzgado: "SANTA FE",
      lugar_procedimiento: lugarIngresado
    }
  };
}

test("460/22: QTH fijo OCV se autocompleta sin exigir escritura manual", () => {
  const operativo = {
    tipo_nombre: "OCV Y DICEP",
    tipo_operativo: "OCV",
    lugar: "RN 168 Km7,5 Ambos Sentidos Dicep"
  };
  assert.equal(requiereLugarManual46022(operativo), false);
  const caso = informe(operativo);
  assert.equal(resolverLugarProcedimiento46022(caso).lugar, operativo.lugar);
  assert.match(construirTextoInformeEspecial(caso), /\*LUGAR:\* RN 168 Km7,5 Ambos Sentidos Dicep/);
  assert.ok(!validarInformeEspecial(caso).some(e => e.includes("lugar exacto")));
});

test("460/22: un QTH fijo en una intersección no es un recorrido", () => {
  assert.equal(esQthDeRecorridoOTramo("Av. Circunvalación Oeste y Calle Mendoza"), false);
  assert.equal(esQthDeRecorridoOTramo("Estación Belgrano - Av. Boulevard Gálvez 1150"), false);
});

test("460/22: patrullaje exige sitio manual aunque tenga un único KM", () => {
  const operativo = {
    tipo_nombre: "PATRULLAJE",
    tipo_operativo: "PATRULLAJE",
    lugar: "RN 168 KM18"
  };
  assert.equal(requiereLugarManual46022(operativo), true);
  const incompleto = informe(operativo);
  assert.ok(validarInformeEspecial(incompleto).some(e => e.includes("lugar exacto")));
  const completado = informe(operativo, "RN 168 KM 12");
  assert.equal(resolverLugarProcedimiento46022(completado).lugar, "RN 168 KM 12");
  assert.match(construirTextoInformeEspecial(completado), /\*LUGAR:\* RN 168 KM 12/);
  assert.ok(!validarInformeEspecial(completado).some(e => e.includes("lugar exacto")));
  assert.equal(completado.operativo.lugar, "RN 168 KM18");
});

test("460/22: si la clasificación de patrullaje vive en datos, también exige lugar", () => {
  assert.equal(requiereLugarManual46022({
    tipo_nombre: "OCV",
    lugar: "RN 168 KM 7,5",
    datos: { tipo_nombre: "PATRULLAJE" }
  }), true);
});

test("460/22: QTH expresado como intervalo exige ubicación manual", () => {
  const lugares = [
    "RN 168 KM 7,5 AL KM 18",
    "RN 168 KM 7,5 A 18",
    "RN 168 KM 7,5 - KM 18",
    "RN 168 KM 7,5 Y RN 168 KM 18",
    "Av. Alem ENTRE calle San Martín Y calle Belgrano",
    "DESDE RN 168 KM7,5 HASTA RN168 KM18"
  ];
  for (const lugar of lugares) {
    const operativo = {tipo_nombre: "OCV", tipo_operativo: "OCV", lugar};
    assert.equal(requiereLugarManual46022(operativo), true, lugar);
    assert.ok(validarInformeEspecial(informe(operativo)).some(e => e.includes("lugar exacto")), lugar);
    const completo = informe(operativo, "RN 168 KM 12");
    assert.match(construirTextoInformeEspecial(completo), /\*LUGAR:\* RN 168 KM 12/);
    assert.ok(!validarInformeEspecial(completo).some(e => e.includes("lugar exacto")));
  }
});

test("460/22: sin QTH del operativo, se puede completar lugar exacto sin modificar la orden", () => {
  const operativo = {tipo_nombre: "OCV", lugar: ""};
  assert.equal(requiereLugarManual46022(operativo), true);
  const caso = informe(operativo, "RN 168 KM 12");
  assert.equal(resolverLugarProcedimiento46022(caso).lugar, "RN 168 KM 12");
  assert.ok(!validarInformeEspecial(caso).some(e => e.includes("lugar")));
});

test("460/22: el modelo muestra un solo lugar y conserva la validación del nuevo campo", () => {
  const html = readFileSync(new URL("../frontend/pantallas/informes/modelos/decreto-460-22/decreto-460-22.html", import.meta.url), "utf8");
  const js = readFileSync(new URL("../frontend/pantallas/informes/modelos/decreto-460-22/decreto-460-22.js", import.meta.url), "utf8");
  assert.match(html, /name="lugar_procedimiento"/);
  assert.match(js, /lugar\.value = requiereManual \? "" : qth/);
  assert.match(js, /lugar\.readOnly = !requiereManual/);
  assert.match(js, /lugar\.required = true/);
  assert.match(js, /getOperativoSeleccionado/);
});
