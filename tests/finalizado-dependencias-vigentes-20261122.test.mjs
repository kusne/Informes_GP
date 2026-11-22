import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepararRevisionInicioOperativo } from "../backend/dominio/inicia/revision-inicio.js";
import { calcularMovimientoRecursos } from "../backend/dominio/compartido/recursos/movimientos-recursos.js";
import { construirResumenRecursosOperativos } from "../backend/dominio/compartido/recursos/catalogo-recursos-operativos.js";
import { resolverRecursosInicioParaFinaliza } from "../backend/dominio/finaliza/recursos-finaliza.js";
import { construirTextoFinalizadoBase } from "../backend/dominio/finaliza/finalizado-salida-texto-base.js";
import { mapearFinalizadoParaSupabase } from "../backend/dominio/finaliza/finalizado-mapper-supabase.js";
import { validarDotacionFinalizadoContraEstado } from "../backend/dominio/finaliza/validar-dotacion-finalizado.js";
import { distribuirDependenciasFinalizado } from "../backend/dominio/finaliza/dependencias-finalizado.js";

const subinspector="Subinspector Mariaux Alejandra Anahi";
const suboficial="Suboficial de Policia Delgado Yasmila Ailen";
const olaguibe="Oficial Olaguibe";
const preiswerk="Suboficial Preiswerk";
const inicioTexto=[
"*Policia de la Provincia de Santa Fe - Direccion General Guardia Provincial*",
"*Brigada Motorizada Centro Norte*",
"*Tercio Charlie*","",
"*Inicia Operativo Preventivo de Seguridad Y Ordenamiento del Tránsito O.OP Dggp 2288/26*","",
"*Fecha:* 22/11/2026","*Horario:* 13:00 A 16:00 HS",
"*Lugar:* RP N.º 1, Arroyo Leyes,En Asentamiento Villa Juana","",
"*Personal Policial:*",subinspector,suboficial,"",
"*Móviles:* 10139","","*Elementos:*","Escopetas: /","Ht: /","Pda: /",
"Impresoras: /","Alómetros: /","Alcoholímetros: /","",
"*Observaciones:*","Para conocimiento superior, Se realizó el Relevo a personal de Sub base."
].join("\n");
const inicio=()=>({
 id:"id-operativo",operativo_key:"op-20261122",guardia_fecha:"2026-11-22",
 estado:"EN_CURSO",updated_at:"2026-11-22T13:05:00Z",
 tipo_evento:"INICIO",tipo_operativo:"GENERICO",
 tipo_nombre:"Operativo Preventivo de Seguridad Y Ordenamiento del Tránsito O.OP Dggp 2288/26",
 fecha_evento:"2026-11-22T13:05:00Z",hora_inicio:"13:00",hora_fin:"16:00",
 lugar:"RP N.º 1, Arroyo Leyes,En Asentamiento Villa Juana",
 personal:[subinspector,suboficial].join("\n"),moviles_motos:"10139",
 elementos:"Escopetas: /\nHt: /\nPda: /\nImpresoras: /\nAlómetros: /\nAlcoholímetros: /",
 observaciones:"Para conocimiento superior, Se realizó el Relevo a personal de Sub base.",
 texto_salida:inicioTexto,
 datos:{fecha_operativo:"2026-11-22",inicio_snapshot:{
    fecha_operativo:"2026-11-22", personal:[subinspector,suboficial].join("\n"),
    moviles_motos:"10139",elementos:"Escopetas: /\nHt: /"
 },ordenes_origen:["O.OP Dggp 2288/26"]}
});
const dependenciaSubBase={nombre:"SUB BASE UOR3",personal:olaguibe+"\n"+preiswerk,moviles:"10138"};

function conDependencias(...dependencias){
 const original=inicio();
 const actualizacion=prepararRevisionInicioOperativo({
   operativo:original,accion:"AMPLIACION",dependencias
 });
 return {...original,...actualizacion.parche,updated_at:"2026-11-22T13:10:00Z"};
}
function finalizado(operativo,otros={}){
 const {seleccionInicial}=resolverRecursosInicioParaFinaliza(operativo);
 const resumen=construirResumenRecursosOperativos(seleccionInicial);
 const formulario={...resumen,mismo_personal:true,mismo_moviles:true,mismos_elementos:true,
   observaciones:"Finaliza sin novedad",...otros};
 const informe={operativo,formulario,guardia_fecha:operativo.guardia_fecha,
   operativo_key:operativo.operativo_key,tipo_operativo:operativo.tipo_operativo,
   fecha_operativo:"2026-11-22",hora_inicio:"13:00",hora_fin:"16:00",
   lugar:operativo.lugar,fecha:"2026-11-22T16:00:00Z"};
 const texto=construirTextoFinalizadoBase(informe);
 return {informe,texto,payload:mapearFinalizadoParaSupabase({...informe,texto})};
}
const segmento=(salida,desde,hasta)=>salida.split(desde)[1].split(hasta)[0];

test("INICIO actualizado: Sub Base conserva sus dos efectivos y móvil en FINALIZADO, sin mezclar con la brigada",()=>{
 const estado=conDependencias(dependenciaSubBase);
 const seleccion=resolverRecursosInicioParaFinaliza(estado).seleccionInicial;
 assert.deepEqual(seleccion.personal,[subinspector,suboficial,olaguibe,preiswerk]);
 assert.deepEqual(seleccion.moviles,["10139","10138"]);
 const {texto,payload}=finalizado(estado);
 const propios=segmento(texto,"*Personal Policial:*","*Móviles:*");
 assert.match(propios,/Mariaux Alejandra Anahi/);
 assert.match(propios,/Delgado Yasmila Ailen/);
 assert.doesNotMatch(propios,/Olaguibe|Preiswerk/);
 assert.match(texto,/\*Móviles:\* 10139/);
 assert.match(texto,/\*Personal Sub Base:\*\nOficial Olaguibe\nSuboficial Preiswerk\n\*Movil Sub Base:\* 10138/);
 assert.equal(texto.match(/Olaguibe/g)?.length,1);
 assert.equal(texto.match(/Preiswerk/g)?.length,1);
 assert.equal(texto.match(/10138/g)?.length,1);
 assert.ok(texto.indexOf("*Movil Sub Base:*") < texto.indexOf("*Elementos:*"));
 assert.ok(texto.indexOf("*Elementos:*") < texto.indexOf("*Observaciones:*"));
 assert.equal(payload.datos.recursos_finalizado.personal.split("\n").length,4);
 assert.equal(validarDotacionFinalizadoContraEstado(estado,payload),true);
});

test("RETIRO previo quita sólo al efectivo y móvil realmente retirados; queda la dotación parcial de Sub Base",()=>{
 const previo=conDependencias(dependenciaSubBase);
 const vigente=resolverRecursosInicioParaFinaliza(previo).seleccionInicial;
 const retiro=calcularMovimientoRecursos({modo:"RETIRO",actual:vigente,
   seleccion:{personal:[olaguibe],moviles:["10138"]}});
 const estado={...previo,updated_at:"2026-11-22T14:30:00Z",
   datos:{...previo.datos,recursos_vigentes:retiro.vigente,
   movimientos_recursos:[{...retiro,fecha_evento:"2026-11-22T14:30:00Z"}]}};
 const {texto,payload}=finalizado(estado);
 assert.deepEqual(resolverRecursosInicioParaFinaliza(estado).seleccionInicial.personal,
   [subinspector,suboficial,preiswerk]);
 assert.match(texto,/\*Personal Sub Base:\*\nSuboficial Preiswerk/);
 assert.doesNotMatch(texto,/Olaguibe|10138|\*Movil Sub Base:\*/);
 assert.equal(validarDotacionFinalizadoContraEstado(estado,payload),true);
});

test("RETIRO de toda la dotación externa omite íntegramente la dependencia en FINALIZADO",()=>{
 const previo=conDependencias(dependenciaSubBase);
 const vigente=resolverRecursosInicioParaFinaliza(previo).seleccionInicial;
 const retiro=calcularMovimientoRecursos({modo:"RETIRO",actual:vigente,
   seleccion:{personal:[olaguibe,preiswerk],moviles:["10138"]}});
 const estado={...previo,updated_at:"2026-11-22T15:00:00Z",
   datos:{...previo.datos,recursos_vigentes:retiro.vigente,movimientos_recursos:[retiro]}};
 const {texto,payload}=finalizado(estado);
 assert.match(texto,/\*Móviles:\* 10139/);
 assert.match(texto,/Mariaux Alejandra Anahi/);
 assert.doesNotMatch(texto,/Sub Base:\*|Olaguibe|Preiswerk|10138/);
 assert.equal(validarDotacionFinalizadoContraEstado(estado,payload),true);
});

test("RELEVO que deja afuera a Sub Base evita reintroducir sus efectivos en FINALIZADO",()=>{
 const previo=conDependencias(dependenciaSubBase);
 const vigente=resolverRecursosInicioParaFinaliza(previo).seleccionInicial;
 const relevo=calcularMovimientoRecursos({modo:"RELEVO",actual:vigente,
   seleccion:{personal:[subinspector,suboficial],moviles:["10139"],elementos:vigente.elementos}});
 const estado={...previo,updated_at:"2026-11-22T15:20:00Z",
   datos:{...previo.datos,recursos_vigentes:relevo.vigente,movimientos_recursos:[relevo]}};
 const {texto,payload}=finalizado(estado);
 assert.doesNotMatch(texto,/Olaguibe|Preiswerk|10138/);
 assert.equal(validarDotacionFinalizadoContraEstado(estado,payload),true);
});

test("Varios organismos: cada personal y móvil aparece una única vez, en su propia sección",()=>{
 const estado=conDependencias(dependenciaSubBase,
   {nombre:"UFIV",personal:"Oficial UFIV",moviles:"20200"});
 const {texto,payload}=finalizado(estado);
 assert.equal(texto.match(/\*Personal Sub Base:\*/g)?.length,1);
 assert.equal(texto.match(/\*Personal UFIV:\*/g)?.length,1);
 assert.equal(texto.match(/10138/g)?.length,1);
 assert.equal(texto.match(/20200/g)?.length,1);
 assert.ok(texto.indexOf("*Personal Sub Base:*")<texto.indexOf("*Personal UFIV:*"));
 assert.equal(validarDotacionFinalizadoContraEstado(estado,payload),true);
});

test("Doble atribución a brigada y dependencia prioriza el origen sin duplicar recursos",()=>{
 const estado=conDependencias(dependenciaSubBase);
 estado.datos.inicio_snapshot.personal += "\n"+olaguibe;
 estado.datos.inicio_snapshot.moviles_motos += " / 10138";
 const {texto}=finalizado(estado);
 assert.equal(texto.match(/Olaguibe/g)?.length,1);
 assert.equal(texto.match(/10138/g)?.length,1);
 assert.doesNotMatch(texto,/\*Personal Sub Base:\*/);
});

test("Selección manual en FINALIZADO no inventa recursos que el oficial desmarcó",()=>{
 const estado=conDependencias(dependenciaSubBase);
 const seleccion=resolverRecursosInicioParaFinaliza(estado).seleccionInicial;
 const resumen=construirResumenRecursosOperativos(seleccion);
 const {texto}=finalizado(estado,{personal:[subinspector,suboficial,preiswerk].join("\n"),
   moviles_motos:"10139",mismo_personal:false,mismo_moviles:false});
 assert.match(texto,/\*Personal Sub Base:\*\nSuboficial Preiswerk/);
 assert.doesNotMatch(texto,/Olaguibe|10138/);
 assert.deepEqual(resumen.moviles_motos,"10139 / 10138");
});

test("Sin dependencias agregadas, salida FINALIZADO conserva el modelo habitual",()=>{
 const estado=inicio();
 const {texto}=finalizado(estado);
 assert.match(texto,/\*Móviles:\* 10139/);
 assert.match(texto,/Mariaux Alejandra Anahi/);
 assert.doesNotMatch(texto,/\*Personal Sub Base:\*|\*Movil UFIV:\*/);
});

test("Se mantienen protección de concurrencia y actualización de dotación antes de FINALIZAR",()=>{
 const codigo=readFileSync(new URL("../frontend/pantallas/finaliza/finaliza.js",import.meta.url),"utf8");
 const repo=readFileSync(new URL("../backend/infraestructura/supabase/operativos-estado-v2-repo.js",import.meta.url),"utf8");
 assert.match(codigo,/obtenerEstadoOperativoV2\(/);
 assert.match(codigo,/resolverRecursosInicioParaFinaliza\(/);
 assert.match(repo,/validarDotacionFinalizadoContraEstado\(existente, limpio\)/);
 assert.match(repo,/\.eq\("updated_at", existente.updated_at\)/);
});
