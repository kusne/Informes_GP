import test from "node:test";
import assert from "node:assert/strict";
import { calcularMovimientoRecursos } from "../backend/dominio/compartido/recursos/movimientos-recursos.js";

const anterior = {
 personal: ["Inspector A","Oficial B"],
 moviles: ["10139"], motos: ["12502"],
 elementos: { ht: ["N°02"], pda: ["05"] }
};

test("RETIRO descuenta únicamente recursos seleccionados y nunca incorpora",()=>{
 const m=calcularMovimientoRecursos({modo:"RETIRO",actual:anterior,
  seleccion:{personal:["Inspector A"],moviles:["10139"],elementos:{pda:["05"]}}});
 assert.deepEqual(m.vigente.personal,["Oficial B"]);
 assert.deepEqual(m.vigente.moviles,[]);
 assert.deepEqual(m.vigente.motos,["12502"]);
 assert.deepEqual(m.vigente.elementos.ht,["N°02"]);
 assert.deepEqual(m.retirados.personal,["Inspector A"]);
 assert.deepEqual(m.retirados.elementos.pda,["05"]);
 assert.deepEqual(m.incorporados.personal,[]);
 assert.deepEqual(m.incorporados.moviles,[]);
});

test("RETIRO rechaza recursos inexistentes, vacío y dejar sin personal",()=>{
 assert.throws(()=>calcularMovimientoRecursos({modo:"RETIRO",actual:anterior,seleccion:{moviles:["99999"]}}),/no pertenece/);
 assert.throws(()=>calcularMovimientoRecursos({modo:"RETIRO",actual:anterior,seleccion:{}}),/seleccioná al menos/);
 assert.throws(()=>calcularMovimientoRecursos({modo:"RETIRO",actual:anterior,seleccion:{personal:[...anterior.personal]}}),/sin personal policial/);
});

test("RELEVO sustituye exactamente lo tildado y registra bajas e incorporaciones",()=>{
 const m=calcularMovimientoRecursos({
  modo:"RELEVO",actual:anterior,
  seleccion:{personal:["Oficial B","Oficial C"],moviles:["12533"],motos:[],elementos:{ht:["N°02"]}}
 });
 assert.deepEqual(m.vigente.personal,["Oficial B","Oficial C"]);
 assert.deepEqual(m.retirados.personal,["Inspector A"]);
 assert.deepEqual(m.retirados.moviles,["10139"]);
 assert.deepEqual(m.retirados.motos,["12502"]);
 assert.deepEqual(m.incorporados.personal,["Oficial C"]);
 assert.deepEqual(m.vigente.elementos.pda,[]);
});

test("ACOPLE suma recursos sin eliminar los existentes ni duplicarlos",()=>{
 const m=calcularMovimientoRecursos({
  modo:"ACOPLE",actual:anterior,
  seleccion:{personal:["Oficial B","Oficial C"],moviles:["10139","12533"],elementos:{pda:["05","19"]}}
 });
 assert.deepEqual(m.vigente.personal,["Inspector A","Oficial B","Oficial C"]);
 assert.deepEqual(m.vigente.moviles,["10139","12533"]);
 assert.deepEqual(m.vigente.elementos.pda,["05","19"]);
 assert.deepEqual(m.retirados.personal,[]);
 assert.deepEqual(m.incorporados.elementos.pda,["19"]);
});

test("ACOPLE sin incorporaciones reales se rechaza",()=>{
 assert.throws(()=>calcularMovimientoRecursos({
  modo:"ACOPLE",actual:anterior,
  seleccion:{personal:["Oficial B"],moviles:["10139"]}
 }),/No se seleccionaron recursos nuevos/);
});

test("RELEVO sin recursos para dejar a cargo se rechaza",()=>{
 assert.throws(()=>calcularMovimientoRecursos({
  modo:"RELEVO",actual:anterior,seleccion:{}
 }),/Seleccioná los recursos/);
});

test("RELEVO repetido sin cambios se rechaza para no registrar falsas salidas",()=>{
 assert.throws(()=>calcularMovimientoRecursos({
  modo:"RELEVO",actual:anterior,seleccion:anterior
 }),/no modifica la dotación vigente/);
});

test("RELEVO sólo de elementos conserva personal y móviles, sin declarar sus retiros",()=>{
 const m=calcularMovimientoRecursos({
  modo:"RELEVO",actual:anterior,
  seleccion:{personal:[...anterior.personal],moviles:[...anterior.moviles],
   motos:[...anterior.motos],elementos:{ht:["N°02"]}}
 });
 assert.deepEqual(m.retirados.personal,[]);
 assert.deepEqual(m.retirados.moviles,[]);
 assert.deepEqual(m.retirados.elementos.pda,["05"]);
});
