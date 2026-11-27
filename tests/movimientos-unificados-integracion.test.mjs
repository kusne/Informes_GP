import test from "node:test";
import assert from "node:assert/strict";
import { planificarTransferencias, validarAltasSinDuplicar } from "../backend/dominio/compartido/recursos/transferencias-unificadas.js";
import { construirInformeMovimientoUnificado } from "../backend/dominio/movimientos/unificado/informe.js";
const a={personal:["Oficial A","Oficial B"],moviles:["100"],motos:[],elementos:{ht:["01"]}};
const b={personal:["Oficial C","Oficial D"],moviles:["200"],motos:[],elementos:{ht:["02"]}};
const op={guardia_fecha:"2026-11-27",tipo_nombre:"OCV",lugar:"QTH PRUEBA",hora_inicio:"14:00",hora_fin:"16:00",datos:{ordenes_origen:["O.S. G.P N°1000/26"]}};
test("intercambio de dos móviles preserva personal y equipos de cada patrulla",()=>{
 const p=planificarTransferencias({actual:a,otro:b,altas:{moviles:["200"]},bajas:{moviles:["100"]},transferencias:{moviles:["100"]}});
 assert.deepEqual(p.principal.vigente.personal,a.personal);
 assert.deepEqual(p.secundario.vigente.personal,b.personal);
 assert.deepEqual(p.principal.vigente.moviles,["200"]);
 assert.deepEqual(p.secundario.vigente.moviles,["100"]);
 assert.deepEqual(p.principal.vigente.elementos,a.elementos);
 assert.doesNotThrow(()=>validarAltasSinDuplicar([p.principal,p.secundario],[]));
 const texto=construirInformeMovimientoUnificado(p.principal,op,"15:30");
 assert.match(texto,/INTERCAMBIO DE MÓVILES/);
 assert.match(texto,/Siendo las 15:30 hs se realiza intercambio de móviles/);
 assert.match(texto,/N° 100/);assert.match(texto,/N° 200/);assert.match(texto,/\*Móviles:\* 200/);assert.match(texto,/1000\/26/);
});
test("retiro por una patrulla visitante no genera alta ni modifica la otra dotación",()=>{
 const p=planificarTransferencias({actual:a,otro:b,bajas:{personal:["Oficial A"]},intervinientes:{personal:b.personal,moviles:b.moviles}});
 assert.equal(p.secundario,null);assert.deepEqual(p.principal.vigente.personal,["Oficial B"]);assert.deepEqual(p.principal.vigente.moviles,["100"]);
 const texto=construirInformeMovimientoUnificado(p.principal,op,"15:30");
 assert.match(texto,/se retira del operativo personal policial: Oficial A/);assert.match(texto,/móvil N° 200/);assert.match(texto,/sin incorporarse/);
});
test("no se incorpora recurso ya asignado a otro operativo sin transferencia",()=>{
 const p=planificarTransferencias({actual:a,altas:{moviles:["200"]}});
 assert.throws(()=>validarAltasSinDuplicar([p.principal],[b]),/ya está asignado/);
});
test("transferencia no permite dejar la otra patrulla sin personal",()=>assert.throws(()=>planificarTransferencias({actual:a,otro:b,altas:{personal:b.personal}}),/FINALIZADO/));

import { readFileSync } from "node:fs";
import { resolverTextoSinItems } from "../frontend/pantallas/pantalla-principal/componentes/selector-operativo-contextual/selector-operativo-contextual.js";
test("MOVIMIENTOS es la única opción de movimientos y conserva el aviso sin operativos",()=>{
 const selector=readFileSync(new URL("../frontend/pantallas/pantalla-principal/componentes/selector-modo-informe/selector-modo-informe.js",import.meta.url),"utf8");
 assert.match(selector,/value="MOVIMIENTOS"/);
 assert.doesNotMatch(selector,/value="(?:RELEVO|ACOPLE|RETIRO)"/);
 assert.equal(resolverTextoSinItems("MOVIMIENTOS"),"NO HAY OPERATIVOS EN CURSO");
 const pantalla=readFileSync(new URL("../frontend/pantallas/pantalla-principal/pantalla-principal.js",import.meta.url),"utf8");
 assert.match(pantalla,/modo === "MOVIMIENTOS" \? "NO HAY OPERATIVOS EN CURSO"/);
});
