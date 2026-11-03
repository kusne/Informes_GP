import test from "node:test";
import assert from "node:assert/strict";
import { construirTextoFinalizadoBase } from "../backend/dominio/finaliza/finalizado-salida-texto-base.js";

const operativo={
  tipo_nombre:"OCV Y ALCOHOLEMIA",
  tipo_operativo:"OCV",
  guardia_fecha:"2026-11-03",
  lugar:"RN168 KM18",
  hora_inicio:"14:00",hora_fin:"18:00"
};

test("FINALIZADO coloca Medidas Cautelares entre Resultados y Detalles",()=>{
  const texto=construirTextoFinalizadoBase({
    operativo,fecha_operativo:"2026-11-03",
    lugar:operativo.lugar,hora_inicio:"14:00",hora_fin:"18:00",
    formulario:{
      personal:"Oficial de Policia Prueba Uno",moviles_motos:"10139",elementos:"Ht: /",
      vehiculos:2,personas:3,actas:1,
      retencion:1,prohibicion_circulacion:1,
      detalles:"(01) 1464 Alcoholemia positiva",
      observaciones:"Sin novedad"
    }
  });
  const iResultados=texto.indexOf("*Resultados:*");
  const iMedidas=texto.indexOf("*Medidas Cautelares:*");
  const iDetalles=texto.indexOf("*Detalles:*");
  assert.ok(iResultados>=0,"falta Resultados");
  assert.ok(iMedidas>iResultados,"Medidas debe figurar después de Resultados");
  assert.ok(iDetalles>iMedidas,"Medidas debe figurar antes de Detalles");
  assert.equal((texto.match(/Medidas Cautelares:/g)||[]).length,1);
  assert.match(texto,/Retención: \(1\)/);
  assert.match(texto,/Prohibición de Circulación: \(1\)/);
});
test("Sin medidas cautelares, no imprime un bloque vacío",()=>{
 const texto=construirTextoFinalizadoBase({
   operativo,fecha_operativo:"2026-11-03",lugar:"RN168 KM18",
   formulario:{personal:"Oficial Prueba",moviles_motos:"10139",elementos:"Ht: /",
     vehiculos:1,personas:1,actas:0,detalles:"(01) 46022 Ejemplo",
     retencion:0,remision:0,prohibicion_circulacion:0,cesion_conduccion:0}
 });
 assert.doesNotMatch(texto,/Medidas Cautelares:/);
 assert.match(texto,/\*Detalles:\*/);
});
