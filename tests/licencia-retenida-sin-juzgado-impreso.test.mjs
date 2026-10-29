import test from "node:test";
import assert from "node:assert/strict";
import { construirTextoInformeEspecial } from "../backend/dominio/informes/informe-especial-salida-texto.js";
import { mapearInformeEspecialParaSupabase } from "../backend/dominio/informes/informe-especial-mapper-supabase.js";

test("ALCOHOLEMIA positiva con licencia retenida no imprime JUZGADO al final", () => {
  const informe = {
    modelo:"ALCOHOLEMIA_POSITIVA",
    lugar:"RN 168 KM7,5",
    fecha_informe:"2026-10-29",
    hora_informe:"11:40",
    formulario:{
      tipo_vehiculo:"SEDAN", marca:"CHEVROLET", modelo_vehiculo:"CELTA",
      conductor:"GARCIA GUILLERMO", dominio:"MDQ389", clase:"B2 27762328",
      numero_acta:"070083605",medida_retencion:true,juzgado:"RINCON",
      medida_prohibicion:false
    },
    calculos:{resultado:0.64,sancionable:true,codigo_sancionable:"2016",tipo_vehiculo_normalizado:"SEDAN"}
  };
  const salida = construirTextoInformeEspecial(informe);
  assert.match(salida,/RETENCIÓN DE LICENCIA DE CONDUCIR/);
  assert.match(salida,/\*OBSERVACIÓN:\*/);
  assert.doesNotMatch(salida,/JUZGADO|RINC[OÓ]N/i);
  assert.ok(salida.trim().endsWith("RETENCIÓN DE LICENCIA DE CONDUCIR."));
  assert.equal(informe.formulario.juzgado,"RINCON");
});

test("RETENCION_LICENCIA no imprime juzgado, y conserva relato, cautelar y observaciones", () => {
  const informe = {
    modelo:"RETENCION_LICENCIA",
    lugar:"RN 168 KM18",
    fecha_informe:"2026-10-29",
    hora_informe:"12:40",
    formulario:{
      motivo_licencia:"VENCIDA_MAS_6_MESES",tipo_vehiculo:"AUTO",
      dominio:"ABC123",marca:"Fiat",modelo_vehiculo:"Uno",
      conductor:"FULANITO",dni:"27762328",clase_licencia:"B2",
      numero_acta:"070083607",fecha_hecho:"2026-10-29",hora_hecho:"12:40",
      personal:"Inspector Marutti",moviles:"10139",localidad:"Santa Fe",
      retencion_licencia:true,juzgado:"OTRO",juzgado_otro:"JUZGADO DE PRUEBA",
      observaciones:"Se informó la medida a la superioridad."
    }
  };
  const salida = construirTextoInformeEspecial(informe);
  assert.match(salida,/RETENCIÓN DE LICENCIA/i);
  assert.match(salida,/se retiene Licencia Nacional de Conducir/);
  assert.match(salida,/\*RELATO:\*/);
  assert.match(salida,/\*OBSERVACIONES:\* Se informó la medida a la superioridad\./);
  assert.doesNotMatch(salida,/JUZGADO/i);
  assert.ok(salida.trim().endsWith("Se informó la medida a la superioridad."));
  assert.equal(informe.formulario.juzgado,"OTRO");
  assert.equal(informe.formulario.juzgado_otro,"JUZGADO DE PRUEBA");
});

test("juzgado queda como dato estructurado y no se elimina de la persistencia", () => {
  const informe = {
    modelo:"RETENCION_LICENCIA",operativo_key:"op-prueba",guardia_fecha:"2026-10-29",
    lugar:"RN 168 KM18",
    formulario:{retencion_licencia:true,juzgado:"SANTA FE"}
  };
  const payload=mapearInformeEspecialParaSupabase(informe);
  assert.equal(payload.datos.juzgado,"SANTA FE");
  assert.equal(payload.datos.retencion_licencia,true);
});
