import test from "node:test";
import assert from "node:assert/strict";
import { interpretarLicenciaDniAlcoholemia } from "../backend/dominio/informes/licencia-dni-alcoholemia.js";
import { construirTextoInformeEspecial } from "../backend/dominio/informes/informe-especial-salida-texto.js";
import { construirNumeralesSugeridosInforme } from "../backend/dominio/informes/informe-especial-reglas-numerales.js";
import { procesarInformeEspecialFormulario } from "../backend/aplicacion/procesamiento/procesar-informe-especial.js";

const base = (clase,medidaRetencion=true) => ({
  modelo:"ALCOHOLEMIA_POSITIVA",
  lugar:"RN 168 KM7,5",
  fecha_informe:"2026-10-25",
  hora_informe:"11:40",
  fecha:"2026-10-25T11:40:00-03:00",
  tipo_operativo:"OCV",
  formulario:{
    tipo_vehiculo:"SEDAN", marca:"CHEVROLET", modelo_vehiculo:"CELTA",
    conductor:"GARCIA GUILLERMO FEDERICO", dominio:"MDQ389",
    resultado:"0,64",numero_acta:"070083605",clase,
    licencia_digital:false,medida_retencion:medidaRetencion,
    medida_prohibicion:false
  },
  calculos:{resultado:0.64,sancionable:true,codigo_sancionable:"2016",tipo_vehiculo_normalizado:"SEDAN"}
});

test("Letra inicial indica clase: B2 y DNI de ocho cifras coexisten en un único campo",()=>{
  const r=interpretarLicenciaDniAlcoholemia("B2 27762328");
  assert.deepEqual({...r,clases:[...r.clases]},{tipo:"LICENCIA",clase:"B2",clases:["B2"],dni:"27762328",dniFormateado:"27.762.328",valido:true});
  assert.equal(interpretarLicenciaDniAlcoholemia("B2, N°27.762.328").tipo,"LICENCIA");
  assert.equal(interpretarLicenciaDniAlcoholemia("A1.3 27762328").clase,"A1.3");
  assert.equal(interpretarLicenciaDniAlcoholemia("G1 27762328").clase,"G1");
});

test("Sólo los ocho dígitos sin clase constituyen un DNI aislado",()=>{
  assert.equal(interpretarLicenciaDniAlcoholemia("27762328").tipo,"DNI");
  assert.equal(interpretarLicenciaDniAlcoholemia("27.762.328").tipo,"DNI");
  assert.equal(interpretarLicenciaDniAlcoholemia("DNI 27762328").tipo,"DNI");
  assert.equal(interpretarLicenciaDniAlcoholemia("B2 2776").valido,false);
});

test("Observación correcta y retención: clase física con documento NO genera Posee DNI B2",()=>{
  const salida=construirTextoInformeEspecial(base("B2 27762328"));
  assert.match(salida,/un vehículo tipo SEDÁN/i);
  assert.match(salida,/Posee licencia de conducir Física clase B2, N° 27\.762\.328\./);
  assert.match(salida,/RETENCIÓN DE LICENCIA DE CONDUCIR/);
  assert.doesNotMatch(salida,/Posee DNI B2/);
});

test("No agregar código 9119 a una licencia con DNI incorporado",()=>{
  const paraLicencia=construirNumeralesSugeridosInforme(base("B2 27762328"));
  assert.equal(paraLicencia.some(item=>String(item.codigo)==="9119"),false);
  assert.equal(paraLicencia.some(item=>String(item.codigo)==="RET_LIC"),true);
  const paraSoloDni=construirNumeralesSugeridosInforme(base("27762328",false));
  assert.equal(paraSoloDni.some(item=>String(item.codigo)==="9119"),true);
});

test("La aplicación envía clase y DNI internamente a Supabase sin pedir nuevos campos visibles",()=>{
  const resultado=procesarInformeEspecialFormulario({
    modelo:"ALCOHOLEMIA_POSITIVA",
    operativoSeleccionado:{
      operativo_key:"ocv-prueba",guardia_fecha:"2026-10-25",lugar:"RN 168 KM7,5",
      tipo_operativo:"OCV"
    },
    formulario:base("B2 27762328").formulario,
  });
  assert.equal(resultado.actual.formulario.clase,"B2 27762328");
  assert.equal(resultado.supabasePayload.datos.licencia_clase,"B2");
  assert.deepEqual(resultado.supabasePayload.datos.licencia_clases,["B2"]);
  assert.equal(resultado.supabasePayload.datos.dni_conductor,"27762328");
  assert.equal(resultado.supabasePayload.datos.licencia_tipo,"FISICA");
});
