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
 assert.match(t,/\*RELEVO OCV Prueba(?: - PRUEBA)?\*/);
 assert.match(t,/\*Fecha:\* 15\/10\/2026/);
 assert.match(t,/\*Horario:\* 14:00 A 18:00 HS/);
 assert.match(t,/\*Lugar:\*/);
 assert.match(t,/\*Personal Policial:\*/);
 assert.match(t,/\*Móviles:\* 12428/);
 assert.match(t,/\*Elementos:\*\nEscopetas: \//);
 assert.match(t,/\*Observaciones:\*/);
 assert.match(t,/Siendo las 13:43 hs/);
 assert.match(t,/Se retira el Móvil N° 10139/);
 assert.doesNotMatch(t,/Fecha de guardia|sin recursos|api\.whatsapp\.com/);
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

test("la interfaz de movimientos utiliza exclusivamente el vínculo nativo para WhatsApp",()=>{
 const ui=readFileSync(resolve(directorio,"../frontend/pantallas/movimientos/movimientos.js"),"utf8");
 const whatsapp=readFileSync(resolve(directorio,"../frontend/servicios/whatsapp/abrir-whatsapp.js"),"utf8");
 assert.match(ui,/abrirWhatsappAppDirectamente\(texto\)/);
 assert.doesNotMatch(ui,/prepararVentanaWhatsapp|abrirWhatsappConTexto/);
 assert.match(whatsapp,/whatsapp:\/\/send\?text=/);
});