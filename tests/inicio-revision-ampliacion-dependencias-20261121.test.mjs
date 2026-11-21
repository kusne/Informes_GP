import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepararRevisionInicioOperativo, obtenerDatosInicioParaRevision } from "../backend/dominio/inicia/revision-inicio.js";

const inicio=()=>({
  id:"id-existente",operativo_key:"guardia-op-1",guardia_fecha:"2026-11-21",
  estado:"EN_CURSO",tipo_evento:"INICIO",tipo_operativo:"OCV",
  tipo_nombre:"OPERATIVO DE CONTROL VEHICULAR O.S. GP N°123/26",
  hora_inicio:"11:00",hora_fin:"13:00",lugar:"RN 168 KM 7,5",
  fecha_evento:"2026-11-21T14:05:00Z",
  personal:"JEFE\nAGENTE A",moviles_motos:"10139",elementos:"Ht: N°02",
  observaciones:"Sin novedad.",
  datos:{
    inicio_snapshot:{
      personal:"JEFE\nAGENTE A",moviles_motos:"10139",
      elementos:"Ht: N°02",observaciones:"Sin novedad.",
      fecha_operativo:"2026-11-21"
    },
    ordenes_origen:["O.S. GP N°123/26"]
  }
});

test("INICIO RECTIFICADO conserva identidad, estado y datos precargados",()=>{
  const op=inicio();
  const base=obtenerDatosInicioParaRevision(op);
  assert.equal(base.formulario.moviles_motos,"10139");
  const r=prepararRevisionInicioOperativo({
    operativo:op,accion:"CORRECCION",
    formulario:{...base.formulario,moviles_motos:"10140",observaciones:"Corrección de móvil."}
  });
  assert.match(r.texto,/INICIO RECTIFICADO/);
  assert.match(r.texto,/10140/);
  assert.equal(r.parche.moviles_motos,"10140");
  assert.equal(r.parche.datos.inicio_snapshot.moviles_motos,"10140");
  assert.equal(r.guardia_fecha,op.guardia_fecha);
  assert.equal(r.operativo_key,op.operativo_key);
  assert.equal(r.parche.estado,undefined);
  assert.equal(r.parche.tipo_evento,undefined);
  assert.equal(op.datos.inicio_snapshot.moviles_motos,"10139");
  assert.equal(r.parche.datos.revisiones_inicio.length,1);
});

test("AMPLIACIÓN agrega UFIV-PAT, personal y móviles en bloques separados, sin reemplazar INICIO",()=>{
  const op=inicio();
  const r=prepararRevisionInicioOperativo({
    operativo:op,accion:"AMPLIACION",
    dependencias:[
      {nombre:"UFIV - PAT",moviles:"12345 / 23456",personal:"INSPECTOR PEREZ\nOFICIAL GOMEZ"},
      {nombre:"ANSV",moviles:"34567",personal:"AGENTE MARTINEZ"}
    ]
  });
  assert.match(r.texto,/AMPLIACIÓN DE INICIO/);
  assert.match(r.texto,/\*PERSONAL UFIV - PAT:\*/);
  assert.match(r.texto,/\*MÓVIL\/ES UFIV - PAT:\* 12345 \/ 23456/);
  assert.match(r.texto,/\*PERSONAL ANSV:\*/);
  assert.match(r.texto,/\*MÓVIL\/ES ANSV:\* 34567/);
  assert.equal(r.parche.personal,undefined);
  assert.equal(r.parche.moviles_motos,undefined);
  assert.equal(r.parche.texto_salida,undefined);
  assert.equal(r.parche.datos.inicio_snapshot.personal,"JEFE\nAGENTE A");
  assert.equal(r.parche.datos.dependencias_agregadas.length,2);
  assert.ok(r.parche.datos.recursos_vigentes.personal.includes("INSPECTOR PEREZ"));
  assert.ok(r.parche.datos.recursos_vigentes.moviles.includes("12345"));
});

test("REVISIÓN posterior conserva movimientos RELEVO/ACOPLE/RETIRO y dotación vigente",()=>{
  const op=inicio();
  op.datos.movimientos_recursos=[{modo:"ACOPLE",fecha_evento:"2026-11-21T14:30:00Z"}];
  op.datos.recursos_vigentes={
    personal:["JEFE","OFICIAL VIGENTE"],moviles:["44444"],motos:[],elementos:{ht:["N°02"]}
  };
  const correccion=prepararRevisionInicioOperativo({
    operativo:op,accion:"CORRECCION",
    formulario:{personal:"JEFE\nOFICIAL B",moviles_motos:"10141",
      elementos:"Ht: N°02",observaciones:"Rectificado"}
  });
  assert.deepEqual(correccion.parche.datos.recursos_vigentes,op.datos.recursos_vigentes);
  assert.equal(correccion.parche.datos.movimientos_recursos.length,1);
  const ampliacion=prepararRevisionInicioOperativo({
    operativo:op,accion:"AMPLIACION",
    dependencias:[{nombre:"UFIV",moviles:"55555",personal:"AGENTE UFIV"}]
  });
  assert.ok(ampliacion.parche.datos.recursos_vigentes.moviles.includes("44444"));
  assert.ok(ampliacion.parche.datos.recursos_vigentes.moviles.includes("55555"));
  assert.equal(ampliacion.parche.datos.movimientos_recursos.length,1);
});

test("Dependencias se acumulan sin duplicar recursos dentro de un organismo",()=>{
  const op=inicio();
  op.datos.dependencias_agregadas=[{nombre:"UFIV",moviles:"55555",personal:"AGENTE UFIV"}];
  const r=prepararRevisionInicioOperativo({operativo:op,accion:"AMPLIACION",
    dependencias:[{nombre:"UFIV",moviles:"55555 / 66666",personal:"AGENTE UFIV\nOFICIAL UFIV"}]});
  assert.equal(r.parche.datos.dependencias_agregadas.length,1);
  assert.equal(r.parche.datos.dependencias_agregadas[0].moviles,"55555 / 66666");
  assert.equal(r.parche.datos.dependencias_agregadas[0].personal,"AGENTE UFIV\nOFICIAL UFIV");
});

test("Bloquea finalizados, INICIO sin cambios y dependencias incompletas",()=>{
  assert.throws(()=>prepararRevisionInicioOperativo({
    operativo:{...inicio(),estado:"FINALIZADO"},accion:"CORRECCION",
    formulario:{personal:"X",moviles_motos:"12345"}
  }),/EN CURSO/);
  const op=inicio();
  assert.throws(()=>prepararRevisionInicioOperativo({
    operativo:op,accion:"CORRECCION",formulario:obtenerDatosInicioParaRevision(op).formulario
  }),/No hay modificaciones/);
  assert.throws(()=>prepararRevisionInicioOperativo({
    operativo:op,accion:"AMPLIACION",dependencias:[{nombre:"UFIV",personal:"",moviles:""}]
  }),/Completá personal o móviles/);
});

test("Front INICIA mantiene separados programados y EN CURSO con reenvío y versión",()=>{
  const main=readFileSync(new URL("../frontend/pantallas/pantalla-principal/pantalla-principal.js",import.meta.url),"utf8");
  const view=readFileSync(new URL("../frontend/pantallas/inicia/revision-inicio.js",import.meta.url),"utf8");
  const repo=readFileSync(new URL("../backend/infraestructura/supabase/operativos-estado-v2-repo.js",import.meta.url),"utf8");
  assert.match(main,/renderSelectorRevisionInicioSeguro/);
  assert.match(main,/obtenerOperativosSeguro\("FINALIZA"\)/);
  assert.match(main,/!estadoPantalla\.inicioRevisionActivo/);
  assert.match(view,/¿Quiere corregir el INICIO\?/);
  assert.match(view,/¿Quiere agregar otras dependencias u organismos\?/);
  assert.match(view,/data-dependencia-moviles/);
  assert.match(view,/data-dependencia-personal/);
  assert.match(view,/prepararVentanaWhatsapp\(\)/);
  assert.match(view,/abrirWhatsappConTexto\(guardado\.texto/);
  assert.match(repo,/\.eq\("estado","EN_CURSO"\)/);
  assert.match(repo,/\.eq\("updated_at",expected_updated_at\)/);
});
