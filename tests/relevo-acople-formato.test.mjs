import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { construirTextoInicioBase } from "../backend/dominio/inicia/inicio-salida-texto-base.js";
import { resolverRecursosInicioParaFinaliza } from "../backend/dominio/finaliza/recursos-finaliza.js";
import { construirResumenRecursosOperativos } from "../backend/dominio/compartido/recursos/catalogo-recursos-operativos.js";
import { calcularMovimientoRecursos } from "../backend/dominio/compartido/recursos/movimientos-recursos.js";

const directorio=dirname(fileURLToPath(import.meta.url));
const repoTexto=readFileSync(resolve(directorio,"../backend/infraestructura/supabase/movimientos-recursos-repo.js"),"utf8");
const bloque=repoTexto.slice(repoTexto.indexOf("const movilidad ="),repoTexto.indexOf("export async function guardarMovimientoOperativo"));
assert.ok(bloque.startsWith("const movilidad ="),"El formateador de movimientos debe poder localizarse");
const { textoMovimiento }=new Function("construirTextoInicioBase","construirResumenRecursosOperativos",bloque.replace("export function textoMovimiento","function textoMovimiento")+";return {textoMovimiento};")(construirTextoInicioBase,construirResumenRecursosOperativos);

const op={
 guardia_fecha:"2026-10-15",
 operativo_key:"test-relevo",
 tipo_nombre:"OCV PRUEBA",
 tipo_operativo:"OCV",
 lugar:"RN168 KM18, TUNEL SUBFLUVIAL",
 hora_inicio:"14:00",
 hora_fin:"18:00",
 datos:{fecha_operativo:"2026-10-15",ordenes_origen:["PRUEBA"],inicio_snapshot:{
  personal:"Subinspector Gonzalez Carlos Nestor\nSuboficial de Policia Rodriguez Nahuel Nicolas",
  moviles_motos:"10139",
  elementos:"Escopetas: /\nHt: /\nPda: 67\nImpresoras: N°39\nAlómetros: ARTL-0425\nAlcoholímetros: ARUJ-0239"
 }}
};

test("RELEVO recobra el móvil y el personal original aunque el catálogo estático no los contenga",()=>{
 const anterior=resolverRecursosInicioParaFinaliza(op).seleccionInicial;
 assert.deepEqual(anterior.moviles,["10139"]);
 assert.equal(anterior.personal.length,2);
 const m=calcularMovimientoRecursos({modo:"RELEVO",actual:anterior,
  seleccion:{personal:["Subcomisario Choque Jose Maria","Inspector Fertonani Sebastian"],
   moviles:["12428"],motos:[],elementos:{pda:["68"]}}});
 assert.deepEqual(m.retirados.moviles,["10139"]);
 assert.equal(m.retirados.personal.length,2);
 const t=textoMovimiento(m,op,"13:43");
 assert.match(t,/\*RELEVO OCV Prueba(?: (?:- )?PRUEBA)?\*/);
 assert.match(t,/\*Fecha:\* 15\/10\/2026/);
 assert.match(t,/\*Horario:\* 14:00 A 18:00 HS/);
 assert.match(t,/\*Lugar:\*/);
 assert.match(t,/\*Personal Policial:\*/);
 assert.match(t,/\*Móviles:\* 12428/);
 assert.match(t,/\*Elementos:\*\nEscopetas: \//);
 assert.match(t,/\*Observaciones:\*/);
 assert.match(t,/Siendo las 13:43 hs/);
 assert.match(t,/Se releva al Móvil N° 10139/);
 assert.match(t,/a cargo del personal saliente:/);
 assert.match(t,/Gonzalez Carlos Nestor/);
 assert.match(t,/Rodriguez Nahuel Nicolas/);
 assert.doesNotMatch(t,/Fecha de guardia|sin recursos|api\.whatsapp\.com/);
});

test("RELEVO posterior con mismo personal y móvil no inventa un segundo retiro",()=>{
 const anterior={
  personal:["Subcomisario Choque Jose Maria","Inspector Fertonani Sebastian"],
  moviles:["12428"],motos:[],
  elementos:{alometros:["ARSA-0360"],impresoras:["N°64"],alcoholimetros:["ARLM-0652"]}
 };
 const nuevo={
  personal:[...anterior.personal],moviles:[...anterior.moviles],motos:[],
  elementos:{alometros:[],impresoras:[],alcoholimetros:[]}
 };
 const m=calcularMovimientoRecursos({modo:"RELEVO",actual:anterior,seleccion:nuevo});
 assert.deepEqual(m.retirados.personal,[]);
 assert.deepEqual(m.retirados.moviles,[]);
 const t=textoMovimiento(m,op,"14:08");
 assert.match(t,/En este relevo no se registra retiro de personal ni de móviles/);
 assert.match(t,/Elementos retirados: ARSA-0360 \/ N°64 \/ ARLM-0652/);
 assert.doesNotMatch(t,/10139|Subinspector Gonzalez|Suboficial de Policia Rodriguez/);
});

test("ACOPLE conserva franja y títulos institucionales, e informa sólo lo incorporado",()=>{
 const anterior=resolverRecursosInicioParaFinaliza(op).seleccionInicial;
 const m=calcularMovimientoRecursos({modo:"ACOPLE",actual:anterior,
  seleccion:{personal:["Inspector Fertonani Sebastian"],moviles:["12428"],
  elementos:{ht:["N°02"]}}});
 const t=textoMovimiento(m,op,"14:30");
 assert.match(t,/\*ACOPLE OCV Prueba/);
 assert.match(t,/\*Fecha:\* 15\/10\/2026/);
 assert.match(t,/\*Horario:\* 14:00 A 18:00 HS/);
 assert.match(t,/\*Móviles:\* 10139 \/ 12428/);
 assert.match(t,/Se incorpora el Móvil N° 12428/);
 assert.match(t,/Siendo las 14:30 hs/);
 assert.doesNotMatch(t,/Se retira|sin recursos|Fecha de guardia/);
});

test("ACOPLE redacta naturalmente el móvil incorporado y su personal a cargo",()=>{
 const actual={
  personal:["Suboficial de Policia Ledesma Sofia","Suboficial de Policia Bravo Nicolas"],
  moviles:["12502"],motos:[],
  elementos:{pda:["67"],impresoras:["N°64"],alometros:["ARSA-0360"],alcoholimetros:["ARLM-0536"]}
 };
 const movimiento=calcularMovimientoRecursos({modo:"ACOPLE",actual,
  seleccion:{
   personal:["Suboficial de Policia Vera Matias","Subinspector Rios Ana"],
   moviles:["10139"],elementos:{pda:["68"]}
  }});
 const ejemplo={
  guardia_fecha:"2026-10-25",tipo_nombre:"OCV Y ALCOHOLEMIA",
  tipo_operativo:"OCV",hora_inicio:"21:30",hora_fin:"23:00",
  lugar:"RN168 KM18, TUNEL SUBFLUVIAL",
  datos:{fecha_operativo:"2026-10-25",ordenes_origen:["O.S. G.P N°2067/26","O. OP G.P N°2121/26"]}
 };
 const salida=textoMovimiento(movimiento,ejemplo,"21:59");
 assert.match(salida,/\*ACOPLE OCV Y Alcoholemia/);
 assert.match(salida,/\*Fecha:\* 25\/10\/2026/);
 assert.match(salida,/\*Horario:\* 21:30 A 23:00 HS/);
 assert.match(salida,/\*Móviles:\* 12502 \/ 10139/);
 assert.match(salida,/Pda: 67 \/ 68/);
 assert.match(salida,/\*Observaciones:\*\nSiendo las 21:59 hs se procede al acople de recursos al operativo\. Se incorpora el Móvil N° 10139\. A cargo de Subinspector Rios Ana y Suboficial de Policia Vera Matias\./);
 assert.doesNotMatch(salida,/Personal incorporado:|Elementos incorporados:|Los recursos anteriores permanecen afectados/);
 assert.deepEqual(movimiento.incorporados.personal,["Suboficial de Policia Vera Matias","Subinspector Rios Ana"]);
 assert.deepEqual(movimiento.vigente.moviles,["12502","10139"]);
});

test("ACOPLE sólo de personal informa quién se incorpora sin atribuirle un móvil",()=>{
 const movimiento=calcularMovimientoRecursos({modo:"ACOPLE",
  actual:{personal:["Inspector Suarez Ana"],moviles:["12502"],elementos:{}},
  seleccion:{personal:["Oficial Ledesma Martin","Suboficial Diaz Laura"]}
 });
 const salida=textoMovimiento(movimiento,op,"18:42");
 assert.match(salida,/Se incorpora al operativo el personal policial Oficial Ledesma Martin y Suboficial Diaz Laura\./);
 assert.doesNotMatch(salida,/A cargo de|Se incorpora el Móvil N°|Los recursos anteriores permanecen/);
});

test("ACOPLE sólo de elementos informa los equipos, sin inventar móvil ni personal",()=>{
 const movimiento=calcularMovimientoRecursos({modo:"ACOPLE",
  actual:{personal:["Inspector Suarez Ana"],moviles:["12502"],elementos:{pda:["67"]}},
  seleccion:{elementos:{pda:["68"],ht:["N°06"]}}
 });
 const salida=textoMovimiento(movimiento,op,"19:05");
 assert.match(salida,/Se incorporan los siguientes elementos: 67 \/ 68|Se incorporan los siguientes elementos: 68 \/ N°06|Se incorporan los siguientes elementos: N°06 \/ 68/);
 assert.doesNotMatch(salida,/A cargo de|Se incorpora el Móvil N°|Personal incorporado:/);
});

test("la interfaz de movimientos utiliza exclusivamente el vínculo nativo para WhatsApp",()=>{
 const ui=readFileSync(resolve(directorio,"../frontend/pantallas/movimientos/movimientos.js"),"utf8");
 const whatsapp=readFileSync(resolve(directorio,"../frontend/servicios/whatsapp/abrir-whatsapp.js"),"utf8");
 assert.match(ui,/abrirWhatsappAppDirectamente\(texto\)/);
 assert.doesNotMatch(ui,/prepararVentanaWhatsapp|abrirWhatsappConTexto/);
 assert.match(whatsapp,/whatsapp:\/\/send\?text=/);
});

test("RETIRO conserva la dotación vigente y mantiene las bajas en el movimiento estructurado",()=>{
 const anterior=resolverRecursosInicioParaFinaliza(op).seleccionInicial;
 assert.ok(anterior.personal.length>=2);
 const m=calcularMovimientoRecursos({modo:"RETIRO",actual:anterior,
  seleccion:{personal:[anterior.personal[0]],moviles:["10139"],elementos:{pda:["67"]}}});
 assert.equal(m.vigente.personal.length,anterior.personal.length-1);
 assert.deepEqual(m.vigente.moviles,[]);
 assert.deepEqual(m.incorporados.personal,[]);
 assert.deepEqual(m.retirados.moviles,["10139"]);
 const salida=textoMovimiento(m,op,"15:22");
 assert.match(salida,/\*RETIRO DE OCV Prueba/);
 assert.match(salida,/Siendo las 15:22 hs se retira el/);
 assert.match(salida,/\*Personal Policial:\*/);
 assert.match(salida,/\*Móviles:\* \/(?:\n|$)/);
 assert.match(salida,/Pda: \/(?:\n|$)/);
 assert.doesNotMatch(salida,/\*RECURSOS RETIRADOS:\*|al acople de recursos|efectuar el relevo/);
});

test("RETIRO figura en selector y formulario de Informes GP",()=>{
 const files=[
  "../frontend/pantallas/pantalla-principal/componentes/selector-modo-informe/selector-modo-informe.js",
  "../frontend/pantallas/pantalla-principal/componentes/contenedor-dinamico/contenedor-dinamico.js",
  "../frontend/pantallas/movimientos/movimientos.js"
 ];
 for(const ruta of files)assert.match(readFileSync(resolve(directorio,ruta),"utf8"),/RETIRO/);
});

test("RETIRO del 29/10 conserva personal, móvil y elementos vigentes sin anexo",()=>{
 const actual={
  personal:[
   "Inspector Marutti Gaston",
   "Subinspector Mariaux Alejandra Anahi",
   "Suboficial de Policia Lopez Carlos Daniel",
   "Suboficial de Policia Benavidez Claudio Uriel"
  ],
  moviles:["10139","12428"],motos:[],
  elementos:{
   escopetas:[],ht:["N°06"],pda:["19","67","68"],
   impresoras:["N°39","N°64"],alometros:["AREC-0127","ARSA-0360"],
   alcoholimetros:["ARUJ-0239"]
  }
 };
 const m=calcularMovimientoRecursos({modo:"RETIRO",actual,seleccion:{
  personal:["Inspector Marutti Gaston"],moviles:["12428"],elementos:{}
 }});
 const operativo={
  guardia_fecha:"2026-10-29",tipo_nombre:"OCV Y DICEP",tipo_operativo:"OCV",
  hora_inicio:"09:00",hora_fin:"12:00",lugar:"RN 168 KM7,5 AMBOS SENTIDOS DICEP",
  datos:{fecha_operativo:"2026-10-29",
   ordenes_origen:["O.S. G.P N°2105/26","O. OP G.P N°2095/26"]}
 };
 const salida=textoMovimiento(m,operativo,"09:18");
 assert.match(salida,/\*RETIRO DE OCV Y DICEP O\.S\. G\.P N°2105\/26 - O\. OP G\.P N°2095\/26\*/);
 assert.match(salida,/\*Horario:\* 09:00 A 12:00 HS/);
 assert.match(salida,/\*Personal Policial:\*\nSubinspector Mariaux Alejandra Anahi/);
 assert.match(salida,/Suboficial de Policia Benavidez Claudio Uriel/);
 assert.doesNotMatch(salida,/\*Personal Policial:\*[^]*Inspector Marutti Gaston[^]*\*Móviles:\*/);
 assert.match(salida,/\*Móviles:\* 10139/);
 assert.match(salida,/Ht: N°06/);
 assert.match(salida,/Pda: 19 \/ 67 \/ 68/);
 assert.match(salida,/Alcoholímetros: ARUJ-0239/);
 assert.match(salida,/Siendo las 09:18 hs se retira el Inspector Marutti Gaston con móvil 12428\. La dotación restante continúa afectada al operativo\./);
 assert.doesNotMatch(salida,/llevando|Se retiran además los siguientes elementos:/);
 assert.doesNotMatch(salida,/\*RECURSOS RETIRADOS:\*|Personal retirado:|Móviles retirados:/);
 assert.deepEqual(m.retirados.personal,["Inspector Marutti Gaston"]);
 assert.deepEqual(m.retirados.moviles,["12428"]);
 assert.deepEqual(m.vigente.moviles,["10139"]);
});

test("INICIA respeta palabras acentuadas completas en título y lugar",()=>{
 const inicio={
  operativo:{
   tipo_nombre:"COLABORACIÓN EN ORDENAMIENTO POR TRABAJO DE LA EMPRESA PROVINCIAL DE LA ENERGÍA",
   hora_inicio:"07:00",hora_fin:"17:00",
   datos:{ordenes_origen:["O. OP G.P N°2127/26"]}
  },
  fecha_operativo:"2026-10-29",hora_inicio:"07:00",hora_fin:"17:00",
  lugar:"AV. CIRCUNVALACIÓN OESTE Y CALLE MENDOZA",
  formulario:{personal:"Suboficial de Policia Aquino Francisco Luis",moviles_motos:"12502"}
 };
 const salida=construirTextoInicioBase(inicio);
 assert.match(salida,/\*Inicia Colaboración en Ordenamiento por Trabajo de la Empresa Provincial de la Energía O\. OP G\.P N°2127\/26\*/);
 assert.match(salida,/\*Lugar:\* Av\. Circunvalación Oeste Y Calle Mendoza/);
 assert.doesNotMatch(salida,/ColaboraciÓN|CircunvalaciÓN|EnergÍA/);
});


test("RETIRO con elementos expresa cantidades, tipos y números en la misma oración",()=>{
 const vigente={
  personal:["Inspector Marutti Gaston","Subinspector Mariaux Alejandra Anahi"],
  moviles:["12428","10139"],motos:[],
  elementos:{
   alometros:["AREC-0127","ARSA-0360"],
   impresoras:["N°05","N°64"],pda:["67"]
  }
 };
 const movimiento=calcularMovimientoRecursos({modo:"RETIRO",actual:vigente,seleccion:{
  personal:["Inspector Marutti Gaston"],
  moviles:["12428"],
  elementos:{alometros:["AREC-0127"],impresoras:["N°05"]}
 }});
 const informe=textoMovimiento(movimiento,op,"09:18");
 assert.match(informe,/Siendo las 09:18 hs se retira el Inspector Marutti Gaston con móvil 12428 llevando \(01\) alómetro AREC-0127 y \(01\) impresora N°05\./);
 assert.match(informe,/\*Móviles:\* 10139/);
 assert.match(informe,/Alómetros: ARSA-0360/);
 assert.match(informe,/Impresoras: N°64/);
 assert.doesNotMatch(informe,/Se retiran además los siguientes elementos:|\*RECURSOS RETIRADOS:\*/);
 assert.deepEqual(movimiento.retirados.elementos.alometros,["AREC-0127"]);
 assert.deepEqual(movimiento.retirados.elementos.impresoras,["N°05"]);
});

test("RETIRO describe equipos solamente cuando son retirados y permite cantidades mayores",()=>{
 const actual={
  personal:["Subinspector Mariaux Alejandra Anahi"],
  moviles:["10139"],
  elementos:{alometros:["AREC-0127","ARSA-0360"],impresoras:["N°05"],pda:["67"]}
 };
 const movimiento=calcularMovimientoRecursos({modo:"RETIRO",actual,seleccion:{
  elementos:{alometros:["AREC-0127","ARSA-0360"],impresoras:["N°05"]}
 }});
 const informe=textoMovimiento(movimiento,op,"10:11");
 assert.match(informe,/Siendo las 10:11 hs se retiran del operativo \(02\) alómetros AREC-0127 \/ ARSA-0360 y \(01\) impresora N°05\./);
 assert.match(informe,/\*Móviles:\* 10139/);
 assert.match(informe,/Pda: 67/);
 assert.doesNotMatch(informe,/llevando|Se retiran además los siguientes elementos:/);
});
