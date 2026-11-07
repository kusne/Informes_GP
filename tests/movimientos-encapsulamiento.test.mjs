import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { construirInformeRELEVO } from "../backend/dominio/movimientos/relevo/informe.js";
import { construirInformeACOPLE } from "../backend/dominio/movimientos/acople/informe.js";
import { construirInformeRETIRO } from "../backend/dominio/movimientos/retiro/informe.js";
import { textoMovimiento } from "../backend/dominio/movimientos/texto-movimiento.js";
const op={guardia_fecha:"2026-11-07",tipo_nombre:"OCV",tipo_operativo:"OCV",lugar:"RN168 KM18",
 hora_inicio:"14:00",hora_fin:"16:00",datos:{fecha_operativo:"2026-11-07",ordenes_origen:["O.S. G.P N°1000/26"]}};
const actual={personal:["Inspector A"],moviles:["10139"],motos:[],
 elementos:{pda:["67"]}};
const anterior={...actual,personal:["Inspector B"],moviles:["10135"]};
const retirar={personal:["Inspector B"],moviles:["10135"],motos:[],elementos:{pda:[]}};
const cases=[
 ["RELEVO",construirInformeRELEVO,{modo:"RELEVO",vigente:actual,anterior,retirados:retirar,incorporados:actual}],
 ["ACOPLE",construirInformeACOPLE,{modo:"ACOPLE",vigente:actual,anterior,retirados:{personal:[],moviles:[],motos:[],elementos:{}},
  incorporados:{personal:["Inspector A"],moviles:["10139"],motos:[],elementos:{pda:["67"]}}}],
 ["RETIRO",construirInformeRETIRO,{modo:"RETIRO",vigente:actual,anterior,retirados:retirar,incorporados:{personal:[],moviles:[],motos:[],elementos:{}}}]
];
for(const [modo,crear,m] of cases)test(modo+" conserva fachada y tiene documento exclusivo",()=>{
 const out=crear(m,op,"15:30");
 assert.equal(textoMovimiento(m,op,"15:30"),out);
 assert.ok(out.includes("15:30 hs"));
 assert.ok(out.includes("*Personal Policial:*"));
});
test("el motor de movimientos no depende de la plantilla de Inicio",()=>{
 for(const slug of ["relevo","acople","retiro"]){
  const source=readFileSync(new URL("../backend/dominio/movimientos/"+slug+"/plantilla.js",import.meta.url),"utf8");
  assert.doesNotMatch(source, /from\s+["'][^"']*\/inicia\//);
  assert.match(source,/function construirTextoInicioBase/);
 }
 const repo=readFileSync(new URL("../backend/infraestructura/supabase/movimientos-recursos-repo.js",import.meta.url),"utf8");
 assert.doesNotMatch(repo,/function redactarObservacionMovimiento|function describirElementosRetirados/);
});
