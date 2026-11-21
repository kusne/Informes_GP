import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  seleccionarOperativosGuardia46022,
  obtenerOperativosDisponibles46022
} from "../backend/aplicacion/informes/decreto-460-22-operativos-disponibles.js";
import { construirTextoInformeEspecial } from "../backend/dominio/informes/informe-especial-salida-texto.js";
import { mapearInformeEspecialParaSupabase } from "../backend/dominio/informes/informe-especial-mapper-supabase.js";
import { iniciarModeloInformeUI } from "../frontend/pantallas/informes/modelos/decreto-460-22/decreto-460-22.js";

const GUARDIA = "2026-11-21";
const operativo = (key, estado, hora, guardia = GUARDIA) => ({
  operativo_key: key, guardia_fecha: guardia, estado,
  created_at: "2026-11-21T08:00:00-03:00",
  fecha_evento: "2026-11-21T" + hora + ":00-03:00",
  updated_at: "2026-11-21T" + hora + ":00-03:00"
});

test("460/22 lista TODOS los en curso y sólo los dos últimos FINALIZADOS de la guardia actual", () => {
  const lista = [
    operativo("fin_viejo", "FINALIZADO", "10:00"),
    operativo("abierto_1", "EN_CURSO", "12:00"),
    operativo("fin_nuevo", "FINALIZADO", "15:00"),
    operativo("abierto_2", "EN_PROCEDIMIENTO", "12:20"),
    operativo("fin_segundo", "FINALIZADO", "14:40"),
    operativo("abierto_3", "EN_CURSO", "12:40"),
    operativo("programado", "PROGRAMADO", "13:00"),
    operativo("historico", "FINALIZADO", "15:50", "2026-11-20")
  ];
  const salida = seleccionarOperativosGuardia46022(lista, GUARDIA);
  assert.deepEqual(new Set(salida.map(op => op.operativo_key)), new Set([
    "abierto_1", "abierto_2", "abierto_3", "fin_nuevo", "fin_segundo"
  ]));
  assert.equal(salida.filter(op => op.estado === "FINALIZADO").length, 2);
  assert.equal(salida.filter(op => op.estado !== "FINALIZADO").length, 3);
  assert.equal(salida.at(-2).operativo_key, "fin_nuevo");
  assert.equal(salida.at(-1).operativo_key, "fin_segundo");
});

test("460/22 conserva dos FINALIZADOS aunque ya no quede ningún operativo en curso", async () => {
  const lista = [
    operativo("f1","FINALIZADO","13:00"),
    operativo("f2","FINALIZADO","14:00"),
    operativo("f3","FINALIZADO","15:00")
  ];
  const respuesta = await obtenerOperativosDisponibles46022({
    ensayo:false, ahora:new Date("2026-11-21T15:30:00-03:00"),
    consultar: async()=>({ok:true,json:async()=>[{guardia_fecha:GUARDIA,estado:"VIGENTE"}]}),
    leerOperativos:async ({guardia_fecha})=>{assert.equal(guardia_fecha,GUARDIA);return lista;}
  });
  assert.deepEqual(respuesta.operativos.map(op=>op.operativo_key),["f3","f2"]);
});

function informe(hora = "") {
  return {
    modelo:"DECRETO_460_22",fecha:"2026-11-21T15:30:00-03:00",
    fecha_informe:"2026-11-21",hora_informe:"15:30",
    guardia_fecha:GUARDIA,operativo_key:"patrulla",
    operativo:{operativo_key:"patrulla",guardia_fecha:GUARDIA,
      tipo_operativo:"PATRULLAJE",tipo_nombre:"PATRULLAJE",lugar:"RECORRIDO RP 1",
      datos:{inicio_snapshot:{personal:"EFECTIVOS DE ENSAYO",moviles_motos:"10139"}}},
    formulario:{marca:"YAMAHA",modelo_vehiculo:"YBR",dominio:"365KLR",
      numero_acta:"123456",codigos_infraccion:"9119",
      lugar_procedimiento:"RP 1 KM 5",hora,juzgado:"RINCON"}
  };
}

test("460/22 imprime y persiste exactamente el lugar y la hora elegidos por el usuario", () => {
  const actual=informe("12:47");
  const texto=construirTextoInformeEspecial(actual);
  const payload=mapearInformeEspecialParaSupabase({...actual,texto});
  assert.match(texto,/\*LUGAR:\* RP 1 KM 5/);
  assert.match(texto,/\*HORA:\* 12:47 Hs/);
  assert.equal(payload.hora_informe,"12:47");
  assert.equal(payload.datos.hora,"12:47");
  const fijo=informe("13:59");
  fijo.operativo={...fijo.operativo,tipo_operativo:"OCV",tipo_nombre:"OCV",lugar:"RN 168 KM 7,5 AMBOS SENTIDOS"};
  fijo.formulario.lugar_procedimiento="RN 168 KM 8";
  assert.match(construirTextoInformeEspecial(fijo),/\*LUGAR:\* RN 168 KM 8/);
});

test("460/22 usa la hora de confección si el campo manual está vacío", () => {
  const actual=informe("");
  const texto=construirTextoInformeEspecial(actual);
  const payload=mapearInformeEspecialParaSupabase({...actual,texto});
  assert.match(texto,/\*HORA:\* 15:30 Hs/);
  assert.equal(payload.hora_informe,"15:30");
});

test("460/22 precarga la hora, mantiene la edición y no autocompleta QTH en patrullaje", async () => {
  const anterior=globalThis.document;
  const escuchasDocumento=new Map();
  const hora={value:"",dataset:{},addEventListener(tipo,fn){this.eventos??={};this.eventos[tipo]=fn;}};
  const lugar={value:"",dataset:{},readOnly:false,required:false,placeholder:""};
  const aviso={hidden:true};
  const eventos=new Map();
  const form={
    isConnected:true,
    querySelector(selector){
      if(selector==='[name="hora"]')return hora;
      if(selector==='[name="lugar_procedimiento"]')return lugar;
      if(selector==="[data-aviso-lugar-procedimiento]")return aviso;
      return null;
    },
    addEventListener(tipo,fn){eventos.set(tipo,fn);},
    dispatchEvent(ev){eventos.get(ev.type)?.(ev);}
  };
  globalThis.document={
    addEventListener(tipo,fn){escuchasDocumento.set(tipo,fn);},
    removeEventListener(tipo){escuchasDocumento.delete(tipo);}
  };
  try{
    await iniciarModeloInformeUI({form,operativoSeleccionado:{
      operativo_key:"patrulla",guardia_fecha:GUARDIA,
      tipo_operativo:"PATRULLAJE",lugar:"RP 1 KM 0 AL KM 25"
    }});
    assert.match(hora.value,/^(?:[01]\d|2[0-3]):[0-5]\d$/);
    assert.equal(lugar.value,"");
    assert.equal(aviso.hidden,false);
    hora.value="11:32";hora.eventos.input();
    escuchasDocumento.get("click")({target:{closest:()=>({id:"botonEnviarWhatsapp"})}});
    assert.equal(hora.value,"11:32","no se debe pisar la hora editada al enviar");
    hora.value="";hora.eventos.input();
    escuchasDocumento.get("click")({target:{closest:()=>({id:"botonEnviarWhatsapp"})}});
    assert.match(hora.value,/^(?:[01]\d|2[0-3]):[0-5]\d$/);
    eventos.get("informesgp:operativo-informe-actualizado")({detail:{operativoSeleccionado:{
      operativo_key:"fijo",guardia_fecha:GUARDIA,
      tipo_operativo:"OCV",lugar:"RN 168 KM 7,5 AMBOS SENTIDOS"
    }}});
    assert.equal(lugar.value,"RN 168 KM 7,5 AMBOS SENTIDOS");
    assert.equal(lugar.readOnly,false);
    assert.equal(aviso.hidden,true);
    lugar.value="RN 168 KM 8";
    assert.equal(lugar.value,"RN 168 KM 8");
  }finally{globalThis.document=anterior;}
});

test("460/22 agrega exclusivamente al modelo el campo Hora editable", () => {
  const html=readFileSync(new URL("../frontend/pantallas/informes/modelos/decreto-460-22/decreto-460-22.html",import.meta.url),"utf8");
  assert.match(html,/<input id="d460HoraInforme" name="hora" type="time"/);
  assert.match(html,/name="lugar_procedimiento"/);
});
