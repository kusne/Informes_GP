import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calcularMovimientoRecursos } from "../backend/dominio/compartido/recursos/movimientos-recursos.js";
import { redactarObservacionAcople, validarAsignacionesAcople }
  from "../backend/dominio/compartido/texto/acople-observaciones.js";

const rios="Subinspector Rios Ana";
const vera="Suboficial de Policia Vera Matias";
const richd="Subinspector Richd Juan";
const miguel="Suboficial de Policia Vera Miguel";

function simular(seleccion = {}) {
 return calcularMovimientoRecursos({
  modo:"ACOPLE",
  actual:{personal:["Inspector Personal Preexistente"],moviles:["12502"],motos:[],
   elementos:{pda:["67"],ht:["N°06"]}},
  seleccion
 });
}

test("contrato: dos móviles con personal a cargo de cada uno, separados por punto y coma",()=>{
 const m=simular({personal:[rios,vera,richd,miguel],moviles:["10139","10135"]});
 m.asignaciones_moviles={
  "10139":[vera,rios],
  "10135":[miguel,richd]
 };
 assert.equal(redactarObservacionAcople(m,"21:59"),
  "Siendo las 21:59 hs se acoplan al operativo el Móvil N° 10139 a cargo de "+
  rios+" y "+vera+"; Móvil N° 10135 a cargo de "+richd+" y "+miguel+".");
 assert.deepEqual(m.vigente.moviles,["12502","10139","10135"]);
});

test("ACOPLE tres personas sin móvil ni elementos imprime únicamente personal nuevo",()=>{
 const m=simular({personal:[rios,vera,miguel]});
 const texto=redactarObservacionAcople(m,"21:59");
 assert.equal(texto,"Siendo las 21:59 hs se acoplan al operativo "+
  rios+", "+vera+" y "+miguel+".");
 assert.doesNotMatch(texto,/Móvil N°|Elementos|Pda 67/);
});

test("ACOPLE personal más elementos sin móvil describe ambos, sólo los incorporados",()=>{
 const m=simular({personal:[rios,vera],elementos:{pda:["68"],ht:["N°02"]}});
 const texto=redactarObservacionAcople(m,"22:10");
 assert.equal(texto,"Siendo las 22:10 hs se acoplan al operativo "+
  rios+" y "+vera+"; asimismo, se incorporan los siguientes Elementos: Pda 68 y Ht N°02.");
 assert.doesNotMatch(texto,/12502|Pda 67|Ht N°06|a cargo de/);
});

test("ACOPLE personal, móvil y elemento nuevo incluye los tres con asignación verdadera",()=>{
 const m=simular({personal:[vera,rios],moviles:["10139"],elementos:{pda:["68"]}});
 m.asignaciones_moviles={"10139":[vera,rios]};
 assert.equal(redactarObservacionAcople(m,"21:59"),
 "Siendo las 21:59 hs se acoplan al operativo el Móvil N° 10139 a cargo de "+
 rios+" y "+vera+"; asimismo, se incorpora el siguiente Elemento: Pda 68.");
});

test("ACOPLE con móviles y personal SIN atribución explícita no inventa vínculo",()=>{
 const m=simular({personal:[rios,vera],moviles:["10139"]});
 assert.equal(redactarObservacionAcople(m,"21:59"),
  "Siendo las 21:59 hs se acoplan al operativo el Móvil N° 10139; asimismo, se incorpora el personal policial "+
  rios+" y "+vera+".");
 assert.doesNotMatch(redactarObservacionAcople(m,"21:59"),/a cargo de/);
});

test("ACOPLE permite personal sin móvil en un evento de dos móviles",()=>{
 const m=simular({personal:[rios,vera,miguel],moviles:["10139","10135"]});
 m.asignaciones_moviles={"10139":[rios,vera]};
 const texto=redactarObservacionAcople(m,"21:59");
 assert.match(texto,/Móvil N° 10139 a cargo de Subinspector Rios Ana y Suboficial de Policia Vera Matias; Móvil N° 10135; asimismo, se incorpora el personal policial Suboficial de Policia Vera Miguel/);
});

test("ACOPLE exclusivamente de móviles o elementos (singular y plural)",()=>{
 assert.equal(redactarObservacionAcople(simular({moviles:["10139"]}),"17:00"),
  "Siendo las 17:00 hs se acopla al operativo el Móvil N° 10139.");
 assert.equal(redactarObservacionAcople(simular({elementos:{pda:["68"]}}),"17:01"),
  "Siendo las 17:01 hs se acopla al operativo el siguiente Elemento: Pda 68.");
 assert.equal(redactarObservacionAcople(simular({elementos:{pda:["68"],ht:["N°02"]}}),"17:02"),
  "Siendo las 17:02 hs se acoplan al operativo los siguientes Elementos: Pda 68 y Ht N°02.");
});

test("no admite asignación a móvil existente, efectivos no incorporados ni doble móvil",()=>{
 const m=simular({personal:[rios,vera],moviles:["10139","10135"]});
 assert.throws(()=>validarAsignacionesAcople(m,{"12502":[rios]}),/no se incorpora/);
 assert.throws(()=>validarAsignacionesAcople(m,{"10139":["Inspector Personal Preexistente"]}),/no se incorpora/);
 assert.throws(()=>validarAsignacionesAcople(m,{"10139":[rios],"10135":[rios]}),/dos móviles/);
 assert.throws(()=>validarAsignacionesAcople(m,{"10139":rios}),/inválida/);
 const normalizadas=validarAsignacionesAcople(m,{"10139":[vera,rios,rios]});
 assert.deepEqual(normalizadas,{"10139":[rios,vera]});
});

test("el formateador permanece aislado; UI solicita la asignación y el evento la conserva",()=>{
 const repo=readFileSync(new URL("../backend/dominio/movimientos/acople/informe.js",import.meta.url),"utf8");
 const frontend=readFileSync(new URL("../frontend/pantallas/movimientos/movimientos.js",import.meta.url),"utf8");
 assert.match(repo,/redactarObservacionAcople\(m,hora\)/);
 assert.match(repo,/movimiento\.asignaciones_moviles=validarAsignacionesAcople/);
 assert.match(frontend,/Sin asignar/);
 assert.match(frontend,/validarAsignacionesAcople\(confirmacion\.movimiento/);
 assert.doesNotMatch(frontend,/asignacionesPorPersona\.set\(nombre,nuevos\[0\]\)/);
 assert.doesNotMatch(repo,/Se procede al acople de recursos al operativo/);
});
