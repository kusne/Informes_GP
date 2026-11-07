import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { redactarObservacionRelevo } from "../backend/dominio/compartido/texto/relevo-observaciones.js";

const lopez="Suboficial de Policia Lopez Carlos Daniel";
const benavidez="Suboficial de Policia Benavidez Claudio Uriel";
const delgado="Suboficial de Policia Delgado Yasmila Ailin";
const movimiento=(personal=[],moviles=[],elementos={},motos=[])=>({
 modo:"RELEVO",retirados:{personal,moviles,motos,elementos}
});

test("contrato institucional: RELEVO continuo aprobado, dos policías, móvil y elementos",()=>{
 const actual=redactarObservacionRelevo(movimiento(
  [lopez,benavidez],["10139"],{ht:["N°02"],pda:["67"]}
 ),"15:30");
 assert.equal(actual,
  "Siendo las 15:30 hs se procede a efectuar el relevo del operativo, "+
  "retirándose del mismo el "+lopez+" y "+benavidez+
  " con Móvil N° 10139 y los siguientes Elementos: Pda 67 y Ht N°02. "+
  "Permanece afectada al operativo la dotación indicada precedentemente.");
 assert.doesNotMatch(actual,/Personal policial que se retira:|Móvil que se retira:|Elementos que se retiran:/);
});

test("tres efectivos y tres elementos: comas y conjunción y antes del último",()=>{
 const actual=redactarObservacionRelevo(movimiento(
  [lopez,benavidez,delgado],["10139","12428"],
  {ht:["N°02"],pda:["67","68"]}
 ),"15:30");
 assert.match(actual,/retirándose del mismo el Suboficial de Policia Lopez Carlos Daniel, Suboficial de Policia Benavidez Claudio Uriel y Suboficial de Policia Delgado Yasmila Ailin con Móviles N° 10139 y 12428/);
 assert.match(actual,/Elementos: Pda 67, Pda 68 y Ht N°02/);
 assert.equal((actual.match(/Permanece afectada/g)||[]).length,1);
});

test("un efectivo femenino confirmado usa la y no el",()=>{
 const actual=redactarObservacionRelevo(movimiento([delgado],["10139"]),"16:05");
 assert.match(actual,/retirándose del mismo la Suboficial de Policia Delgado Yasmila Ailin con Móvil N° 10139/);
});

test("género explícito por metadata y nombres con acentos se respetan",()=>{
 const nombre="Subinspector Mariaux Alejandra Anahi";
 const actual=redactarObservacionRelevo(movimiento([nombre],[]),"16:05",{
  tratamientosPersonal:{"subinspector MARIAUX Alejandra Anahí":"femenino"}
 });
 assert.match(actual,/retirándose del mismo la Subinspector Mariaux Alejandra Anahi\./);
});

test("si el padrón no acredita género, no se deduce por el nombre",()=>{
 const actual=redactarObservacionRelevo(movimiento(
  ["Suboficial de Policia Ejemplo Carolina"],[]),"16:05");
 assert.match(actual,/retirándose del mismo personal policial: Suboficial de Policia Ejemplo Carolina\./);
 assert.doesNotMatch(actual,/del mismo la Suboficial|del mismo el Suboficial/);
});

test("relevo sólo de móvil redacta salida sin atribuir chofer",()=>{
 const actual=redactarObservacionRelevo(movimiento([],["10139"]),"17:10");
 assert.match(actual,/retirándose del mismo el Móvil N° 10139\./);
 assert.doesNotMatch(actual,/personal policial:|con Móvil/);
});

test("relevo sólo de elementos y varios del mismo grupo tiene enumeración natural",()=>{
 const actual=redactarObservacionRelevo(movimiento([] ,[],{
  pda:["67","67","68"],ht:["N°02"]
 }),"18:12");
 assert.match(actual,/retirándose del mismo los siguientes Elementos: Pda 67, Pda 68 y Ht N°02\./);
 assert.doesNotMatch(actual,/\(0\d\)|Elementos que se retiran:/);
});

test("formateador RELEVO está encapsulado y el repositorio no recrea su gramática",()=>{
 const repo=readFileSync(new URL("../backend/dominio/movimientos/relevo/informe.js",import.meta.url),"utf8");
 assert.match(repo,/import \{ redactarObservacionRelevo \} from "\.\.\/\.\.\/compartido\/texto\/relevo-observaciones\.js"/);
 assert.match(repo,/redactarObservacionRelevo\(m,hora/);
 assert.doesNotMatch(repo,/Personal policial que se retira:|Móvil que se retira:|Elementos que se retiran:/);
});
