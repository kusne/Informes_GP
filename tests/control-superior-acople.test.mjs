import test from "node:test";
import assert from "node:assert/strict";
import { seleccionAcopleControlSuperior, crearAcopleDesdeControlSuperior }
  from "../backend/dominio/informes/control-superior-acople.js";
import { resolverRecursosInicioParaFinaliza }
  from "../backend/dominio/finaliza/recursos-finaliza.js";

const anterior={
 personal:["Subinspector Gonzalez"],moviles:["10139"],motos:[],
 elementos:{pda:["67"],ht:["N°02"]}
};
test("Sin SE ACOPLA, CONTROL SUPERIOR no altera la dotación",()=>{
 const evento=crearAcopleDesdeControlSuperior({actual:anterior,
   formulario:{autoridad_jefe:true,movil_12428:true,se_acopla:false}});
 assert.equal(evento,null);
 assert.deepEqual(anterior.personal,["Subinspector Gonzalez"]);
});
test("SE ACOPLA suma sólo las autoridades y móviles seleccionados",()=>{
 const formulario={
  se_acopla:true,autoridad_jefe:true,autoridad_subjefe:true,
  autoridad_otros:true,nombre_autoridad:"Inspector Marutti Gastón",
  movil_12428:true,movil_otro:true,moviles_otros:"12502/10139"
 };
 const sel=seleccionAcopleControlSuperior(formulario);
 assert.deepEqual(sel.personal,["JEFE","SUBJEFE","Inspector Marutti Gastón"]);
 assert.deepEqual(sel.moviles,["12428","12502","10139"]);
 const acople=crearAcopleDesdeControlSuperior({formulario,actual:anterior,informe_key:"CS1"});
 assert.equal(acople.origen,"CONTROL_SUPERIOR");
 assert.deepEqual(acople.retirados.personal,[]);
 assert.deepEqual(acople.incorporados.personal,["JEFE","SUBJEFE","Inspector Marutti Gastón"]);
 assert.deepEqual(acople.incorporados.moviles,["12428","12502"]);
 assert.deepEqual(acople.vigente.moviles,["10139","12428","12502"]);
 assert.deepEqual(acople.vigente.elementos.pda,["67"]);
 const finaliza=resolverRecursosInicioParaFinaliza({
  datos:{recursos_vigentes:acople.vigente}
 });
 assert.equal(finaliza.seleccionInicial.personal.includes("JEFE"),true);
 assert.equal(finaliza.seleccionInicial.personal.includes("Inspector Marutti Gastón"),true);
 assert.equal(finaliza.seleccionInicial.moviles.includes("12502"),true);
});
test("Un checkbox sin marcar no autoriza ACOPLE aunque se seleccione personal",()=>{
 const acople=crearAcopleDesdeControlSuperior({formulario:{
  se_acopla:false,autoridad_otros:true,nombre_autoridad:"Oficial X",movil_otro:true,moviles_otros:"12502"
 },actual:anterior});
 assert.equal(acople,null);
});
test("Si tilda SE ACOPLA no puede generar un movimiento sin recursos nuevos",()=>{
 assert.throws(()=>crearAcopleDesdeControlSuperior({actual:anterior,
  formulario:{se_acopla:true,autoridad_jefe:false,autoridad_subjefe:false}}),/seleccionar personal o móviles/);
 assert.throws(()=>crearAcopleDesdeControlSuperior({actual:anterior,
  formulario:{se_acopla:true,movil_otro:true,moviles_otros:"10139"}}),/No se seleccionaron recursos nuevos/);
});
