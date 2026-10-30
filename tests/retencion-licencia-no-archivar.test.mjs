import test from "node:test";
import assert from "node:assert/strict";
import { persistirEnvio } from "../api/persistencia-api.js";
import { construirTextoInformeEspecial } from "../backend/dominio/informes/informe-especial-salida-texto.js";
import { mapearInformeEspecialParaSupabase } from "../backend/dominio/informes/informe-especial-mapper-supabase.js";

test("RETENCION_LICENCIA: se genera para compartir, pero no se guarda en Supabase", async () => {
  const informe = {
    modelo: "RETENCION_LICENCIA",
    lugar: "RN 168 KM18",
    formulario: {
      motivo_licencia: "VENCIDA_MAS_6_MESES",
      retencion_licencia: true,
      numero_acta: "070083607",
      juzgado: "SANTA FE"
    }
  };
  const salida = construirTextoInformeEspecial(informe);
  assert.match(salida, /RETENCI[ÓO]N DE LICENCIA/i);
  assert.match(salida, /se retiene Licencia Nacional de Conducir/);
  assert.doesNotMatch(salida, /\*JUZGADO:\*/);

  // El informe puede seguir generándose con su texto completo.
  const payload = mapearInformeEspecialParaSupabase({...informe,texto:salida});
  assert.equal(payload.tipo_informe, "RETENCION_LICENCIA");
  const persistencia = await persistirEnvio({modo:"INFORMES",payload});
  assert.equal(persistencia.ok,true);
  assert.equal(persistencia.saltado,true);
  assert.equal(persistencia.sinGuardado,true);
  assert.match(persistencia.mensaje,/no se guarda/i);
});

test("Sólo se excluye el informe autónomo: la alcoholemia mantiene su licencia retenida", () => {
  const texto = construirTextoInformeEspecial({
    modelo: "ALCOHOLEMIA_POSITIVA",
    lugar: "RN 168 KM18",
    fecha_informe:"2026-10-29", hora_informe:"20:30",
    formulario:{
      medida_retencion:true,
      resultado:"0,64",
      tipo_vehiculo:"SEDAN",
      clase:"B2 27762328",
      juzgado:"RINCON"
    },
    calculos:{sancionable:true,resultado:0.64,codigo_sancionable:"2016"}
  });
  assert.match(texto,/RETENCIÓN DE LICENCIA DE CONDUCIR/);
  assert.doesNotMatch(texto,/\*JUZGADO:\*/);
});
