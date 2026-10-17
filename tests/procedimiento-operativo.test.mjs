import test from "node:test";
import assert from "node:assert/strict";
import { procesarInformeEspecialFormulario }
  from "../backend/aplicacion/procesamiento/procesar-informe-especial.js";
import { filtrarOperativosIniciadosParaFinalizar }
  from "../backend/aplicacion/operativos/operativos.js";

const base={
  operativoSeleccionado:{
    id:"op-01",operativo_key:"OCV-2018",guardia_fecha:"2026-10-17",
    estado:"EN_CURSO",tipo_nombre:"OCV Y ALCOHOLEMIA",tipo_operativo:"OCV",
    hora_inicio:"17:00",hora_fin:"19:00",lugar:"RP1 KM17",
    datos:{ordenes_origen:["O.S N°2018/26","O.OP N°2072/26"]},
  },
  modelo:"PROCEDIMIENTO",
  formulario:{
    procedimiento_id:"proc-unico-1",
    hecho:"PROCEDIMIENTO POR TENENCIA ILEGAL DE ARMA DE FUEGO",
    lugar_hecho:"RP1 KM17 ARROYO LEYES",
    fecha_hecho:"2026-10-17",hora_hecho:"18:00",
    personal:"Subinspector Ejemplo\nSuboficial Ejemplo",
    moviles:"10139/12402",
    observaciones:"En prevención de delitos se inicia un procedimiento. Se ampliará.",
  }
};
test("Genera informe institucional, fecha hora reales, y sólo 1 procedimiento policial",()=>{
  const r=procesarInformeEspecialFormulario(base);
  assert.deepEqual(r.errores,[]);
  assert.match(r.texto,/HECHO: PROCEDIMIENTO POR TENENCIA ILEGAL DE ARMA DE FUEGO/);
  assert.match(r.texto,/HORARIO:\* 18:00hs/);
  assert.match(r.texto,/PERSONAL POLICIAL/);
  assert.match(r.texto,/MÓVIL\/ES/);
  assert.match(r.texto,/Se ampliará/);
  assert.equal(r.supabasePayload.tipo_informe,"PROCEDIMIENTO");
  assert.equal(r.supabasePayload.fecha_evento,"2026-10-17T18:00:00-03:00");
  assert.equal(r.supabasePayload.operativo_key,"OCV-2018");
  assert.equal(r.supabasePayload.calculos.incrementos_sugeridos.procedimientos_policiales,1);
  assert.equal(r.supabasePayload.calculos.incrementos_sugeridos.aprehendidos,undefined);
  assert.equal(r.supabasePayload.calculos.incrementos_sugeridos.actas,undefined);
});
test("Reenvío del mismo hecho tiene misma key; hecho distinto en mismo minuto tiene otra",()=>{
  const uno=procesarInformeEspecialFormulario(base).supabasePayload;
  const otro=procesarInformeEspecialFormulario({...base,
    formulario:{...base.formulario,procedimiento_id:"proc-unico-2"}}).supabasePayload;
  assert.equal(uno.informe_key,procesarInformeEspecialFormulario(base).supabasePayload.informe_key);
  assert.notEqual(uno.informe_key,otro.informe_key);
  assert.equal(uno.hora_informe,otro.hora_informe);
});
test("Valida motivo, lugar y relato; nunca crea procedimiento incompleto",()=>{
  const r=procesarInformeEspecialFormulario({...base,
    formulario:{...base.formulario,hecho:"PROCEDIMIENTO POR",observaciones:"",lugar_hecho:""}});
  assert.ok(r.errores.length>=3,r.errores.join("\n"));
});
test("FINALIZADO admite EN_PROCEDIMIENTO y no permite finalizar dos veces",()=>{
  const activos=filtrarOperativosIniciadosParaFinalizar([
    {...base.operativoSeleccionado,estado:"EN_PROCEDIMIENTO"},
    {...base.operativoSeleccionado,operativo_key:"OCV-2",estado:"EN_CURSO"},
    {...base.operativoSeleccionado,operativo_key:"OCV-3",estado:"FINALIZADO"},
  ]);
  assert.deepEqual(activos.map(x=>x.operativo_key).sort(),["OCV-2","OCV-2018"]);
});
