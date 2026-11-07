import test from "node:test";
import assert from "node:assert/strict";
import { construirTextoInicioBase } from "../backend/dominio/inicia/inicio-salida-texto-base.js";
import { mapearInicioParaSupabase } from "../backend/dominio/inicia/inicio-mapper-supabase.js";

const generar = (cambios = {}) => {
 const inicio = {
  modo: "INICIA", fecha: "2026-11-06T22:30:00-03:00",
  fecha_operativo: "2026-11-06", guardia_fecha: "2026-11-06",
  tipo_operativo: "OCV", operativo_key: "inicio-lluvia-ejemplo",
  hora_inicio: "22:30", hora_fin: "00:00",
  lugar: "Rn168 Km18, Tunel Subfluvial",
  operativo: {
   tipo_nombre: "OCV Y ALCOHOLEMIA", tipo_operativo: "OCV",
   datos:{ordenes_origen:["O.S. G.P N°2171/26","O. OP G.P N°2220/26"]}
  },
  formulario:{
   personal: [
    "Subinspector Mariaux Alejandra Anahi",
    "Suboficial de Policia Aquino Francisco Luis",
    "Suboficial de Policia Benavidez Claudio Uriel",
    "Suboficial de Policia Delgado Yasmila Ailen"
   ].join("\n"),
   moviles_motos: "10139",
   elementos: [
    "Escopetas: /","Ht: /","Pda: 05 / 19 / 67 / 68",
    "Impresoras: N°39","Alómetros: ARSA-0360",
    "Alcoholímetros: ARUJ-0239"
   ].join("\n"),
   presencia_activa:true,presencia_activa_motivo:"LLUVIA",
   presencia_activa_otro:"",observaciones:""
  }
 };
 return {
  ...inicio,
  ...cambios,
  formulario: {...inicio.formulario,...(cambios.formulario || {})}
 };
};

test("INICIO con lluvia produce el texto institucional indicado para Presencia Activa",()=>{
 const inicio=generar();
 const texto=construirTextoInicioBase(inicio);
 assert.match(texto,/\*Inicia OCV Y Alcoholemia O\.S\. G\.P N°2171\/26 - O\. OP G\.P N°2220\/26\*/);
 assert.match(texto,/\*Fecha:\* 06\/11\/2026/);
 assert.match(texto,/\*Horario:\* 22:30 A 00:00 HS/);
 assert.match(texto,/\*Lugar:\* Rn168 Km18, Tunel Subfluvial/i);
 assert.match(texto,/\*Personal Policial:\*\nSubinspector Mariaux Alejandra Anahi/);
 assert.match(texto,/Suboficial de Policia Delgado Yasmila Ailen/);
 assert.match(texto,/\*Móviles:\* 10139/);
 assert.match(texto,/Pda: 05 \/ 19 \/ 67 \/ 68/);
 assert.match(texto,/Impresoras: N°39/);
 assert.match(texto,/Alómetros: ARSA-0360/);
 assert.match(texto,/Alcoholímetros: ARUJ-0239/);
 assert.match(texto,/\*Observaciones:\*\nSe realiza con presencia activa debido a inclemencias del tiempo \(lloviznas\)\.$/);
 assert.doesNotMatch(texto,/\*Inicia Presencia Activa|\nLluvia\s*$/);
});

test("No crea texto por lluvia si Presencia Activa no está marcada",()=>{
 const texto=construirTextoInicioBase(generar({formulario:{presencia_activa:false}}));
 assert.match(texto,/\*Observaciones:\*\nSin novedad$/);
 assert.doesNotMatch(texto,/inclemencias del tiempo|lloviznas/);
});

test("Con lluvia y observaciones manuales, conserva ambas sin perder datos",()=>{
 const texto=construirTextoInicioBase(generar({formulario:{observaciones:"Se efectuó comunicación con la superioridad."}}));
 assert.match(texto,/\*Observaciones:\*\nSe efectuó comunicación con la superioridad\.\nSe realiza con presencia activa debido a inclemencias del tiempo \(lloviznas\)\.$/);
});

test("El motivo OTROS conserva su comportamiento anterior y no se interpreta como lluvia",()=>{
 const texto=construirTextoInicioBase(generar({formulario:{presencia_activa_motivo:"OTROS",presencia_activa_otro:"Falta de personal"}}));
 assert.match(texto,/\*Observaciones:\*\nFalta de personal$/);
 assert.doesNotMatch(texto,/inclemencias del tiempo/);
});

test("Supabase conserva tipo, órdenes, dotación y motivo estructurados",()=>{
 const inicio=generar();
 const texto=construirTextoInicioBase(inicio);
 const payload=mapearInicioParaSupabase({...inicio,texto});
 assert.equal(payload.tipo_operativo,"OCV");
 assert.equal(payload.tipo_nombre,"OCV Y ALCOHOLEMIA");
 assert.deepEqual(payload.datos.ordenes_origen,["O.S. G.P N°2171/26","O. OP G.P N°2220/26"]);
 assert.equal(payload.datos.presencia_activa,true);
 assert.equal(payload.datos.presencia_activa_motivo,"Lluvia");
 assert.equal(payload.datos.inicio_snapshot.moviles_motos,"10139");
 assert.equal(payload.datos.inicio_snapshot.elementos.includes("ARUJ-0239"),true);
 assert.equal(payload.texto_salida,texto);
});
