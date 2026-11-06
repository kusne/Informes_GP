import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  resolverRetencionPorLicenciaDni
} from "../backend/dominio/informes/licencia-dni-alcoholemia.js";

const dir=dirname(fileURLToPath(import.meta.url));
const leer=r=>readFileSync(resolve(dir,r),"utf8");
const siguiente=(valor, anterior={tipo:"SIN_DATO",marcada:false,automatica:false},licenciaDigital=false)=>
  resolverRetencionPorLicenciaDni({
    valor, licenciaDigital,
    tipoAnterior:anterior.tipo,
    retencionMarcada:anterior.marcada,
    marcadaAutomaticamente:anterior.automatica
  });

test("La etiqueta del input dice exactamente CLASE LIC./DNI",()=>{
 const html=leer("../frontend/pantallas/informes/modelos/alcoholemia-positiva/alcoholemia-positiva.html");
 assert.match(html,/<label for="alcoClase">CLASE LIC\.\/DNI<\/label>/);
 assert.match(html,/<input id="alcoClase" name="clase"/);
});

test("Clase de licencia válida (letra y número) tilda Retención automáticamente",()=>{
 for(const clase of ["B2","A1.3","C1","G3","F","B2 30787085"]) {
  const r=siguiente(clase);
  assert.deepEqual(r,{tipo:"LICENCIA_FISICA",marcada:true,automatica:true},clase);
 }
});

test("Un DNI aislado de ocho cifras destilda incluso una Retención previamente marcada",()=>{
 let estado=siguiente("B2");
 assert.equal(estado.marcada,true);
 estado=siguiente("30787085",estado);
 assert.deepEqual(estado,{tipo:"DNI",marcada:false,automatica:false});
 estado=siguiente("B2",estado);
 assert.equal(estado.marcada,true);
 estado=siguiente("30.787.085",{tipo:"LICENCIA_FISICA",marcada:true,automatica:false});
 assert.deepEqual(estado,{tipo:"DNI",marcada:false,automatica:false});
});

test("Respeta destildado manual con la misma clase, pero no lo arrastra a otra categoría",()=>{
 const automatico=siguiente("B2");
 const manual={...automatico,marcada:false,automatica:false};
 assert.deepEqual(siguiente("B2 30787085",manual),manual);
 const dni=siguiente("30787085",manual);
 assert.equal(dni.marcada,false);
 assert.equal(siguiente("G2",dni).marcada,true);
});

test("Sin clase física, o con licencia digital, no se fuerza retención",()=>{
 const anterior=siguiente("B2");
 assert.deepEqual(siguiente("",anterior),{tipo:"SIN_DATO",marcada:false,automatica:false});
 assert.deepEqual(siguiente("B2",anterior,true),{tipo:"SIN_DATO",marcada:false,automatica:false});
 assert.deepEqual(siguiente("30787085",anterior,true),{tipo:"DNI",marcada:false,automatica:false});
 assert.equal(siguiente("B2",anterior).marcada,true);
});

test("El formulario utiliza el cálculo compartido en cambios de clase y licencia digital",()=>{
 const ui=leer("../frontend/pantallas/informes/modelos/alcoholemia-positiva/alcoholemia-positiva.js");
 assert.match(ui,/resolverRetencionPorLicenciaDni\(/);
 assert.match(ui,/checkboxRetencion\.checked = siguiente\.marcada/);
 assert.match(ui,/campoLicenciaDni\?\.addEventListener\("input", actualizarRetencionLicenciaFisica\)/);
 assert.match(ui,/checkboxLicenciaDigital\?\.addEventListener\("change", actualizarRetencionLicenciaFisica\)/);
});
