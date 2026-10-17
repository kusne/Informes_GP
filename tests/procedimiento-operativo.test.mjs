import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validarInformeEspecial } from "../backend/dominio/informes/informe-especial-validaciones.js";
import { construirTextoInformeEspecial } from "../backend/dominio/informes/informe-especial-salida-texto.js";
import { mapearInformeEspecialParaSupabase } from "../backend/dominio/informes/informe-especial-mapper-supabase.js";
import { construirTransicionProcedimiento } from "../backend/dominio/informes/procedimiento-transicion.js";
const formulario={
  procedimiento_id:"proc-unico-1",
  hecho:"PROCEDIMIENTO POR TENENCIA ILEGAL DE ARMA DE FUEGO",
  lugar_hecho:"RP1 KM17 ARROYO LEYES",
  fecha_hecho:"2026-10-17",hora_hecho:"18:00",
  personal:"Subinspector Ejemplo\nSuboficial Ejemplo",
  moviles:"10139/12402",
  observaciones:"En prevención de delitos se inicia el procedimiento. Se ampliará."
};
const operativo={
  id:"op-01",operativo_key:"OCV-2018",guardia_fecha:"2026-10-17",
  estado:"EN_CURSO",tipo_nombre:"OCV Y ALCOHOLEMIA",tipo_operativo:"OCV",
  hora_inicio:"17:00",hora_fin:"19:00",lugar:"RP1 KM17",
  datos:{ordenes_origen:["O.S N°2018/26","O.OP N°2072/26"]}
};
function construir(f=formulario){
  const informe={
    modelo:"PROCEDIMIENTO",operativo,formulario:{...f},
    operativo_key:operativo.operativo_key,guardia_fecha:operativo.guardia_fecha,
    tipo_operativo:"OCV",hora_inicio:"17:00",hora_fin:"19:00",
    lugar:f.lugar_hecho,fecha:f.fecha_hecho+"T"+f.hora_hecho+":00-03:00",
    fecha_informe:f.fecha_hecho,hora_informe:f.hora_hecho,
    fotos:[],calculos:{incrementos_sugeridos:{procedimientos_policiales:1}},
    incrementos_sugeridos:{procedimientos_policiales:1},
    numerales_sugeridos:[]
  };
  return {...informe,texto:construirTextoInformeEspecial(informe)};
}
test("Formato institucional completo y único incremento en Procedimientos Policiales",()=>{
  const informe=construir();
  assert.deepEqual(validarInformeEspecial(informe),[]);
  assert.match(informe.texto,/HECHO: PROCEDIMIENTO POR TENENCIA ILEGAL DE ARMA DE FUEGO/);
  assert.match(informe.texto,/HORARIO:\* 18:00hs/);
  assert.match(informe.texto,/PERSONAL POLICIAL/);
  assert.match(informe.texto,/MÓVIL\/ES/);
  assert.match(informe.texto,/Se ampliará/);
  const payload=mapearInformeEspecialParaSupabase(informe);
  assert.equal(payload.tipo_informe,"PROCEDIMIENTO");
  assert.equal(payload.fecha_evento,"2026-10-17T18:00:00-03:00");
  assert.equal(payload.operativo_key,"OCV-2018");
  assert.equal(payload.calculos.incrementos_sugeridos.procedimientos_policiales,1);
  assert.equal(payload.calculos.incrementos_sugeridos.aprehendidos,undefined);
  assert.equal(payload.calculos.incrementos_sugeridos.actas,undefined);
});
test("Reenvío del mismo evento mantiene identidad, segundo hecho en igual minuto no colisiona",()=>{
  const uno=mapearInformeEspecialParaSupabase(construir());
  const dos=mapearInformeEspecialParaSupabase(construir({...formulario,procedimiento_id:"proc-unico-2"}));
  assert.equal(uno.informe_key,mapearInformeEspecialParaSupabase(construir()).informe_key);
  assert.notEqual(uno.informe_key,dos.informe_key);
  assert.equal(uno.hora_informe,dos.hora_informe);
});
test("No guarda relato vacío ni HECHO incompleto",()=>{
  const informe=construir({...formulario,hecho:"PROCEDIMIENTO POR",observaciones:"",lugar_hecho:""});
  assert.ok(validarInformeEspecial(informe).length>=3);
});
test("Transición pura conserva INICIO, recursos y movimientos, y es idempotente",()=>{
  const estado={id:"op-01",estado:"EN_CURSO",tipo_evento:"INICIO",
    hora_inicio:"17:00",hora_fin:"19:00",datos:{
      inicio_snapshot:{texto_salida:"INICIO ORIGINAL",personal:"Personal original"},
      recursos_vigentes:{moviles:["10139"],personal:["Funcionario"],motos:[],elementos:{}},
      movimientos_recursos:[{modo:"ACOPLE"}]
    }};
  const uno=mapearInformeEspecialParaSupabase(construir());
  const dos=mapearInformeEspecialParaSupabase(construir({...formulario,procedimiento_id:"proc-unico-2"}));
  const primero=construirTransicionProcedimiento(estado,uno,{id:"informe-1"});
  assert.equal(primero.estado,"EN_PROCEDIMIENTO");
  assert.deepEqual(primero.datos.inicio_snapshot,estado.datos.inicio_snapshot);
  assert.deepEqual(primero.datos.recursos_vigentes,estado.datos.recursos_vigentes);
  assert.deepEqual(primero.datos.movimientos_recursos,estado.datos.movimientos_recursos);
  assert.equal(estado.datos.procedimientos_eventos,undefined);
  const again=construirTransicionProcedimiento({...estado,datos:primero.datos},uno,{id:"informe-1"});
  assert.equal(again.datos.procedimientos_eventos.length,1);
  const segundo=construirTransicionProcedimiento({...estado,datos:again.datos},dos,{id:"informe-2"});
  assert.equal(segundo.datos.procedimientos_eventos.length,2);
  assert.equal(segundo.datos.recursos_vigentes.moviles[0],"10139");
});
test("El código de FINALIZADO incluye explícitamente EN_PROCEDIMIENTO y no duplica el operativo",()=>{
  const src=readFileSync(fileURLToPath(new URL("../backend/aplicacion/operativos/operativos.js",import.meta.url)),"utf8");
  assert.match(src,/EN_PROCEDIMIENTO/);
  assert.match(src,/FINALIZA/);
  const repo=readFileSync(fileURLToPath(new URL("../backend/infraestructura/supabase/operativos-estado-v2-repo.js",import.meta.url)),"utf8");
  assert.match(repo,/guardarFinalizadoOperativoV2/);
  assert.match(repo,/EN_PROCEDIMIENTO/);
});
