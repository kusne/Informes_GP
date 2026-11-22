import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepararRevisionInicioOperativo, obtenerDatosInicioParaRevision } from "../backend/dominio/inicia/revision-inicio.js";

const textoInicioOriginal = [
  "*Policia de la Provincia de Santa Fe - Direccion General Guardia Provincial*",
  "*Brigada Motorizada Centro Norte*",
  "*Tercio Charlie*",
  "",
  "*Inicia Operativo Preventivo de Seguridad Y Ordenamiento del Tránsito O.OP Dggp 2288/26*",
  "",
  "*Fecha:* 22/11/2026",
  "*Horario:* 13:00 A 16:00 HS",
  "*Lugar:* RP N.º 1, Arroyo Leyes,En Asentamiento Villa Juana",
  "",
  "*Personal Policial:*",
  "Subinspector Mariaux Alejandra Anahi",
  "Suboficial de Policia Delgado Yasmila Ailen",
  "",
  "*Móviles:* 10139",
  "",
  "*Elementos:*",
  "Escopetas: /",
  "Ht: /",
  "Pda: /",
  "Impresoras: /",
  "Alómetros: /",
  "Alcoholímetros: /",
  "",
  "*Observaciones:*",
  "Para conocimiento superior, Se realizó el relevo a personal de Sub base."
].join("\n");

const inicio=()=>({
  id:"id-existente",operativo_key:"guardia-op-1",guardia_fecha:"2026-11-21",
  estado:"EN_CURSO",tipo_evento:"INICIO",tipo_operativo:"OCV",
  tipo_nombre:"OPERATIVO DE CONTROL VEHICULAR O.S. GP N°123/26",
  hora_inicio:"11:00",hora_fin:"13:00",lugar:"RN 168 KM 7,5",
  fecha_evento:"2026-11-21T14:05:00Z",
  personal:"JEFE\nAGENTE A",moviles_motos:"10139",elementos:"Ht: N°02",
  observaciones:"Sin novedad.",
  texto_salida:textoInicioOriginal,
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
  assert.match(r.texto,/\\*Inicia Operativo Preventivo/);
  assert.doesNotMatch(r.texto,/AMPLIACIÓN DE INICIO|\\*GUARDIA:\\*|\\*OPERATIVO:\\*/);
  assert.ok(r.texto.startsWith(textoInicioOriginal.split("*Móviles:* 10139")[0]));
  assert.ok(r.texto.endsWith(textoInicioOriginal.split("*Elementos:*")[1]));
  assert.match(r.texto,/\*Personal UFIV - PAT:\*/);
  assert.match(r.texto,/\*Movil UFIV - PAT:\* 12345 \/ 23456/);
  assert.match(r.texto,/\*Personal ANSV:\*/);
  assert.match(r.texto,/\*Movil ANSV:\* 34567/);
  assert.equal(r.parche.personal,undefined);
  assert.equal(r.parche.moviles_motos,undefined);
  assert.equal(r.parche.texto_salida,r.texto);
  assert.equal(r.parche.datos.inicio_texto_base,textoInicioOriginal);
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

test("Etiqueta breve de revisión de INICIO en selector y encabezado", () => {
  const main=readFileSync(new URL("../frontend/pantallas/pantalla-principal/pantalla-principal.js",import.meta.url),"utf8");
  const revision=readFileSync(new URL("../frontend/pantallas/inicia/revision-inicio.js",import.meta.url),"utf8");
  for (const codigo of [main,revision]) {
    assert.match(codigo,/Modificar un INICIO/);
    assert.doesNotMatch(codigo,/Modificar un INICIO ya enviado/);
  }
});


test("Actualización Sub Base UOR3: salida EXACTA del INICIO original más el bloque en su lugar",()=>{
  const op=inicio();
  const r=prepararRevisionInicioOperativo({operativo:op,accion:"AMPLIACION",
    dependencias:[{nombre:"SUB BASE UOR3",moviles:"10138",personal:"Oficial Olaguibe\nSuboficial Preiswerk"}]});
  const bloque = [
    "*Personal Sub Base:*",
    "Oficial Olaguibe",
    "Suboficial Preiswerk",
    "*Movil Sub Base:* 10138"
  ].join("\n");
  const esperado=textoInicioOriginal.replace("*Móviles:* 10139\n\n*Elementos:*",
    "*Móviles:* 10139\n\n"+bloque+"\n\n*Elementos:*");
  assert.equal(r.texto,esperado);
  assert.equal(r.parche.texto_salida,esperado);
  assert.equal(r.parche.datos.inicio_texto_base,textoInicioOriginal);
  assert.equal(r.parche.datos.inicio_snapshot.personal,"JEFE\nAGENTE A");
  assert.equal(r.parche.estado,undefined);
  assert.equal(r.parche.tipo_evento,undefined);
});

test("Dos actualizaciones sucesivas conservan el texto inicial sin duplicar bloques",()=>{
  const op=inicio();
  const r1=prepararRevisionInicioOperativo({operativo:op,accion:"AMPLIACION",
    dependencias:[{nombre:"SUB BASE UOR3",moviles:"10138",personal:"Oficial Olaguibe\nSuboficial Preiswerk"}]});
  const actualizado={...op,...r1.parche};
  const r2=prepararRevisionInicioOperativo({operativo:actualizado,accion:"AMPLIACION",
    dependencias:[{nombre:"UFIV",moviles:"20200",personal:"Oficial UFIV"}]});
  assert.equal(r2.texto.match(/Inicia Operativo Preventivo/g)?.length,1);
  assert.equal(r2.texto.match(/\*Personal Sub Base:\*/g)?.length,1);
  assert.equal(r2.texto.match(/\*Personal UFIV:\*/g)?.length,1);
  assert.ok(r2.texto.indexOf("*Personal Sub Base:*")<r2.texto.indexOf("*Personal UFIV:*"));
  assert.ok(r2.texto.indexOf("*Personal UFIV:*")<r2.texto.indexOf("*Elementos:*"));
  assert.ok(r2.texto.endsWith(textoInicioOriginal.split("*Elementos:*")[1]));
  assert.equal(r2.parche.datos.inicio_texto_base,textoInicioOriginal);
  assert.equal(r2.parche.datos.dependencias_agregadas.length,2);
  assert.equal(op.texto_salida,textoInicioOriginal);
});

test("Una dependencia ya agregada se actualiza sin duplicar efectivos ni móvil",()=>{
  const op=inicio();
  const r1=prepararRevisionInicioOperativo({operativo:op,accion:"AMPLIACION",
    dependencias:[{nombre:"UFIV",moviles:"10138",personal:"Oficial Uno"}]});
  const r2=prepararRevisionInicioOperativo({operativo:{...op,...r1.parche},accion:"AMPLIACION",
    dependencias:[{nombre:"UFIV",moviles:"10138 / 10200",personal:"Oficial Uno\nSuboficial Dos"}]});
  assert.equal(r2.texto.match(/\*Personal UFIV:\*/g)?.length,1);
  assert.equal(r2.texto.match(/Oficial Uno/g)?.length,1);
  assert.equal(r2.texto.match(/10138/g)?.length,1);
  assert.match(r2.texto,/\*Movil UFIV:\* 10138 \/ 10200/);
  assert.equal(r2.parche.datos.dependencias_agregadas.length,1);
});

test("Informes históricos con ampliaciones antiguas se reconstruyen desde el INICIO guardado, no del texto nuevo",()=>{
  const op=inicio();
  op.datos.dependencias_agregadas=[{nombre:"UFIV",personal:"AGENTE A",moviles:"12345"}];
  const r=prepararRevisionInicioOperativo({operativo:op,accion:"AMPLIACION",
    dependencias:[{nombre:"ANSV",personal:"AGENTE B",moviles:"67890"}]});
  assert.equal(r.texto.match(/\*Personal UFIV:\*/g)?.length,1);
  assert.equal(r.texto.match(/\*Personal ANSV:\*/g)?.length,1);
  assert.equal(r.texto.match(/\*Móviles:\*/g)?.length,1);
  assert.doesNotMatch(r.texto,/DEPENDENCIA \/ ORGANISMO/);
});

test("INICIO rectificado mantiene su última versión como base de la siguiente actualización",()=>{
  const op=inicio();
  const correccion=prepararRevisionInicioOperativo({operativo:op,accion:"CORRECCION",
    formulario:{personal:"AGENTE MODIFICADO",moviles_motos:"20222",elementos:"Ht: N°3",observaciones:"Rectificado."}});
  const siguiente=prepararRevisionInicioOperativo({operativo:{...op,...correccion.parche},
    accion:"AMPLIACION",dependencias:[{nombre:"UFIV",personal:"Agente C",moviles:"10001"}]});
  assert.match(siguiente.texto,/INICIO RECTIFICADO/);
  assert.match(siguiente.texto,/\*Móviles:\* 20222/);
  assert.match(siguiente.texto,/Agente C/);
  assert.equal(siguiente.texto.match(/\*Personal UFIV:\*/g)?.length,1);
});

test("El informe original es obligatorio: nunca inventar otra plantilla o ubicación del bloque",()=>{
  assert.throws(()=>prepararRevisionInicioOperativo({operativo:{...inicio(),texto_salida:"",
    datos:{inicio_snapshot:{}}},accion:"AMPLIACION",
    dependencias:[{nombre:"UFIV",personal:"Agente C",moviles:"123"}]}),/texto original/);
  assert.throws(()=>prepararRevisionInicioOperativo({operativo:{...inicio(),texto_salida:"INICIO SIN MÓVILES"},
    accion:"AMPLIACION",dependencias:[{nombre:"UFIV",personal:"Agente C",moviles:"123"}]}),/bloque Móviles/);
});

test("Reversión de FINALIZADO respeta texto de INICIO actualizado y la vista previa envía el mismo contenido",()=>{
  const repo=readFileSync(new URL("../backend/infraestructura/supabase/operativos-estado-v2-repo.js",import.meta.url),"utf8");
  const vista=readFileSync(new URL("../frontend/pantallas/inicia/revision-inicio.js",import.meta.url),"utf8");
  assert.match(repo,/texto_salida: datosActuales\.inicio_texto_actualizado \|\| snapshot\.texto_salida/);
  assert.match(vista,/vista\.textContent = guardado\.texto/);
  assert.match(vista,/ACTUALIZACIÓN DEL INICIO/);
  assert.doesNotMatch(vista,/Confirmás la AMPLIACIÓN DE INICIO/);
});
