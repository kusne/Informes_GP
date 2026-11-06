import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { filtrarCatalogoRecursosAcople } from "../backend/dominio/compartido/recursos/recursos-acople-disponibles.js";
import { calcularMovimientoRecursos } from "../backend/dominio/compartido/recursos/movimientos-recursos.js";
import { construirTextoInformeEspecial } from "../backend/dominio/informes/informe-especial-salida-texto.js";

const dir = dirname(fileURLToPath(import.meta.url));
const source = path => readFileSync(resolve(dir, path), "utf8");

test("ACOPLE excluye recursos del INICIO y de cualquier movimiento ya vigente", () => {
 const catalogo = {
  personal:["Subinspector Mariaux Alejandra Anahi", "Oficial de Policia Lascuraín Ismael Ignacio",
   "JEFE", "Inspector Fertonani Sebastian", "Suboficial de Policia Aquino Francisco Luis"],
  moviles:["10139","12428","8105"], motos:["8989","9029"],
  elementos:[{clave:"pda",items:["67","68"]},{clave:"ht",items:["N°06","N°08"]}]
 };
 const inicio = {
  personal:["Subinspector Mariaux Alejandra Anahi","Subcomisario Choque José María"],
  moviles:["10139"], motos:["8989"],
  elementos:{pda:["67"],ht:["N°06"]}
 };
 const original = structuredClone(catalogo);
 const opciones = filtrarCatalogoRecursosAcople(catalogo,inicio);
 assert.deepEqual(opciones.personal, [
  "Oficial de Policia Lascuraín Ismael Ignacio","Inspector Fertonani Sebastian",
  "Suboficial de Policia Aquino Francisco Luis"
 ]);
 assert.deepEqual(opciones.moviles,["12428","8105"]);
 assert.deepEqual(opciones.motos,["9029"]);
 assert.deepEqual(opciones.elementos.map(g=>g.items),[["68"],["N°08"]]);
 assert.deepEqual(catalogo,original,"No mutar padrón ni opciones de INICIO");
});

test("ACOPLE posterior excluye también los recursos incorporados por ACOPLE previo", () => {
 const disponibles=filtrarCatalogoRecursosAcople({
  personal:["A","B","C"],moviles:["10139","12428"],
  motos:[],elementos:[{clave:"pda",items:["67","68"]}]
 },{personal:["A","B"],moviles:["10139","12428"],elementos:{pda:["67"]}});
 assert.deepEqual(disponibles.personal,["C"]);
 assert.deepEqual(disponibles.moviles,[]);
 assert.deepEqual(disponibles.elementos[0].items,["68"]);
});

test("ACOPLE no permite reiterar recursos vigentes aunque se envíe selección manipulada", () => {
 const actual={personal:["A"],moviles:["10139"],elementos:{pda:["67"]}};
 assert.throws(()=>calcularMovimientoRecursos({modo:"ACOPLE",actual,
  seleccion:{personal:["A","B"]}}),/ya está incorporado/);
 assert.throws(()=>calcularMovimientoRecursos({modo:"ACOPLE",actual,
  seleccion:{elementos:{pda:["67","68"]}}}),/ya está incorporado/);
 const movimiento=calcularMovimientoRecursos({modo:"ACOPLE",actual,
  seleccion:{personal:["B"],elementos:{pda:["68"]}}});
 assert.deepEqual(movimiento.vigente.personal,["A","B"]);
 assert.deepEqual(movimiento.vigente.elementos.pda,["67","68"]);
});

test("ALCOHOLEMIA ofrece Juzgado sin requerir retención y contiene RURAL", () => {
 const html=source("../frontend/pantallas/informes/modelos/alcoholemia-positiva/alcoholemia-positiva.html");
 const js=source("../frontend/pantallas/informes/modelos/alcoholemia-positiva/alcoholemia-positiva.js");
 assert.match(html,/<option value="RURAL">Rural<\/option>/);
 assert.match(html, /data-juzgado-wrap>/);
 assert.match(html, /<select id="alcoJuzgado" name="juzgado">/);
 assert.match(js, /actualizarJuzgado = iniciarSelectorJuzgado\(form\);/);
 const informe={
  modelo:"ALCOHOLEMIA_POSITIVA",lugar:"RN168",
  formulario:{tipo_vehiculo:"RURAL",juzgado:"SAUCE VIEJO",medida_retencion:false},
  calculos:{resultado:0.75,sancionable:false}
 };
 const texto=construirTextoInformeEspecial(informe);
 assert.match(texto,/vehículo tipo RURAL/);
 assert.match(texto,/Juzgado interviniente: SAUCE VIEJO\./);
 assert.doesNotMatch(texto,/RETENCIÓN DE LICENCIA DE CONDUCIR/);
});

test("Alcoholemia conserva selección OTRO en Observaciones sin afectar informes de licencia",()=>{
 const texto=construirTextoInformeEspecial({
  modelo:"ALCOHOLEMIA_POSITIVA",lugar:"RN168",
  formulario:{tipo_vehiculo:"SEDAN",juzgado:"OTRO",juzgado_otro:"JUZGADO ESPECIAL"},
  calculos:{resultado:0.35,sancionable:false}
 });
 assert.match(texto,/Juzgado interviniente: JUZGADO ESPECIAL\./);
 const licencia=construirTextoInformeEspecial({
  modelo:"RETENCION_LICENCIA",lugar:"RN168",hora_informe:"15:00",
  formulario:{motivo_licencia:"VENCIDA_MAS_6_MESES",juzgado:"SANTA FE",observaciones:"SIN NOVEDAD"}
 });
 assert.doesNotMatch(licencia,/Juzgado interviniente:/);
});
