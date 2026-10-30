import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calcularMovimientoRecursos } from "../backend/dominio/compartido/recursos/movimientos-recursos.js";
import { prepararConfirmacionMovimiento } from "../backend/dominio/compartido/recursos/resumen-relevo-confirmacion.js";
import { construirResumenRecursosOperativos } from "../backend/dominio/compartido/recursos/catalogo-recursos-operativos.js";
import { resolverRecursosInicioParaFinaliza } from "../backend/dominio/finaliza/recursos-finaliza.js";
import { validarDotacionFinalizadoContraEstado } from "../backend/dominio/finaliza/validar-dotacion-finalizado.js";
import { mapearFinalizadoParaSupabase } from "../backend/dominio/finaliza/finalizado-mapper-supabase.js";
import { construirTextoFinalizadoBase } from "../backend/dominio/finaliza/finalizado-salida-texto-base.js";

const lopez="Suboficial de Policia Lopez Carlos Daniel";
const benavidez="Suboficial de Policia Benavidez Claudio Uriel";
const aquino="Suboficial de Policia Aquino Francisco Luis";
const delgado="Suboficial de Policia Delgado Yasmila Ailen";
const original={
  personal:[lopez,benavidez],moviles:["12502"],motos:[],
  elementos:{pda:[],impresoras:[],alometros:[],alcoholimetros:[]}
};
const nuevos={
  personal:[aquino,delgado],moviles:["10139","12428"],motos:[],
  elementos:{pda:["67"],impresoras:["N°39"],
    alometros:["AREC-0127"],alcoholimetros:["ARLM-0536"]}
};
const hora="2026-10-30T03:01:27.007Z";
function estadoDe(m){
  return {
    operativo_key:"test-puente-carretero",guardia_fecha:"2026-10-29",
    estado:"EN_CURSO",updated_at:hora,tipo_operativo:"PRESENCIA_ACTIVA",
    tipo_nombre:"PRESENCIA ACTIVA",hora_inicio:"19:00",hora_fin:"06:00",
    lugar:"PUENTE CARRETERO",
    datos:{fecha_operativo:"2026-10-29",ordenes_origen:[
      "O.S. G.P N°2105/26","O. OP G.P N°1880/26"
    ],recursos_vigentes:m.vigente,movimientos_recursos:[m]}
  };
}
function construir(estado,parcial={}){
  const resumen=construirResumenRecursosOperativos(estado.datos.recursos_vigentes);
  const formulario={
    ...resumen,mismo_personal:true,mismo_moviles:true,mismos_elementos:true,
    observaciones:"Sin novedad",...parcial
  };
  return {finalizado:{
      operativo:estado,fecha_operativo:"2026-10-29",
      guardia_fecha:estado.guardia_fecha,operativo_key:estado.operativo_key,
      tipo_operativo:"PRESENCIA_ACTIVA",hora_inicio:"19:00",hora_fin:"06:00",
      lugar:"PUENTE CARRETERO",formulario
    },resumen};
}

test("RELEVO retira los policías del inicio no seleccionados y FINALIZADO no los reimprime",()=>{
  const movimiento=calcularMovimientoRecursos({
    modo:"RELEVO",actual:original,seleccion:nuevos
  });
  assert.deepEqual(movimiento.retirados.personal,[lopez,benavidez]);
  assert.deepEqual(movimiento.vigente.personal,[aquino,delgado]);
  assert.deepEqual(movimiento.retirados.moviles,["12502"]);
  const estado=estadoDe(movimiento);
  const fuente=resolverRecursosInicioParaFinaliza(estado);
  assert.deepEqual(fuente.seleccionInicial.personal,[aquino,delgado]);
  const {finalizado}=construir(estado);
  const salida=construirTextoFinalizadoBase(finalizado);
  const personal=salida.split("*Personal Policial:*")[1].split("*Móviles:*")[0];
  assert.match(personal,/Aquino Francisco Luis/);
  assert.match(personal,/Delgado Yasmila Ailen/);
  assert.doesNotMatch(personal,/Lopez Carlos Daniel|Benavidez Claudio Uriel/);
  assert.match(salida,/\*Móviles:\* 10139 \/ 12428/);
  assert.doesNotMatch(salida,/\*Móviles:\* 12502/);
  const payload=mapearFinalizadoParaSupabase({...finalizado,texto:salida});
  assert.equal(payload.datos.recursos_finalizado.estado_dotacion_version,hora);
  assert.equal(validarDotacionFinalizadoContraEstado(estado,payload),true);
});

test("un RELEVO que deja los cuatro policías advierte que ninguno se retira",()=>{
  const resultado=prepararConfirmacionMovimiento({
    modo:"RELEVO",actual:original,
    seleccion:{...nuevos,personal:[...original.personal,...nuevos.personal]}
  });
  assert.deepEqual(resultado.movimiento.retirados.personal,[]);
  assert.equal(resultado.advertenciaSinBajas,true);
  assert.match(resultado.texto,/ATENCIÓN: NO se retira ningún policía/);
  for(const nombre of [lopez,benavidez,aquino,delgado])
    assert.ok(resultado.texto.includes(nombre));
});

test("un RELEVO correcto avisa exactamente qué efectivo se retira",()=>{
  const resultado=prepararConfirmacionMovimiento({
    modo:"RELEVO",actual:original,seleccion:nuevos
  });
  assert.equal(resultado.advertenciaSinBajas,false);
  assert.match(resultado.texto,/PERSONAL QUE SE RETIRA/);
  assert.match(resultado.texto,/Lopez Carlos Daniel/);
  assert.match(resultado.texto,/Benavidez Claudio Uriel/);
  assert.match(resultado.texto,/PERSONAL QUE QUEDA AL FINAL/);
  assert.match(resultado.texto,/Aquino Francisco Luis/);
  assert.match(resultado.texto,/MÓVILES QUE SE RETIRAN: 12502/);
});

test("FINALIZADO impide reintroducir personal y móviles retirados desde la pantalla",()=>{
  const estado=estadoDe(calcularMovimientoRecursos({
    modo:"RELEVO",actual:original,seleccion:nuevos
  }));
  const {finalizado}=construir(estado);
  const payload=mapearFinalizadoParaSupabase(finalizado);
  payload.datos.recursos_finalizado.personal=[lopez,benavidez,aquino,delgado].join("\n");
  assert.throws(()=>validarDotacionFinalizadoContraEstado(estado,payload),/personal/);
  payload.datos.recursos_finalizado.personal=[aquino,delgado].join("\n");
  payload.datos.recursos_finalizado.moviles_motos="12502 / 10139 / 12428";
  assert.throws(()=>validarDotacionFinalizadoContraEstado(estado,payload),/móviles/);
});

test("si hubo otro RELEVO o RETIRO después de abrir FINALIZADO se exige actualizar",()=>{
  const estado=estadoDe(calcularMovimientoRecursos({
    modo:"RELEVO",actual:original,seleccion:nuevos
  }));
  const payload=mapearFinalizadoParaSupabase(construir(estado).finalizado);
  estado.updated_at="2026-10-30T03:15:00.000Z";
  assert.throws(()=>validarDotacionFinalizadoContraEstado(estado,payload),/dotación cambió/);
});

test("ACOPLE y RETIRO sucesivos utilizan exclusivamente la dotación vigente",()=>{
  const primera=calcularMovimientoRecursos({modo:"RELEVO",actual:original,seleccion:nuevos});
  const acople=calcularMovimientoRecursos({
    modo:"ACOPLE",actual:primera.vigente,
    seleccion:{personal:["Inspector Prueba Nuevo"],moviles:["12533"]}
  });
  const retiro=calcularMovimientoRecursos({
    modo:"RETIRO",actual:acople.vigente,
    seleccion:{personal:[aquino],moviles:["12428"]}
  });
  const estado=estadoDe(retiro);
  const {finalizado}=construir(estado);
  const salida=construirTextoFinalizadoBase(finalizado);
  const personal=salida.split("*Personal Policial:*")[1].split("*Móviles:*")[0];
  assert.doesNotMatch(personal,/Lopez|Benavidez|Aquino/);
  assert.match(personal,/Delgado/);
  assert.match(personal,/Inspector Prueba Nuevo/);
  assert.match(salida,/\*Móviles:\* 10139 \/ 12533/);
});

test("el frontend muestra resumen y no cierra con un estado antiguo si falla refresco",()=>{
  const movimiento=readFileSync(new URL("../frontend/pantallas/movimientos/movimientos.js",import.meta.url),"utf8");
  const finaliza=readFileSync(new URL("../frontend/pantallas/finaliza/finaliza.js",import.meta.url),"utf8");
  const repo=readFileSync(new URL("../backend/infraestructura/supabase/operativos-estado-v2-repo.js",import.meta.url),"utf8");
  assert.match(movimiento,/data-resumen-dotacion/);
  assert.match(movimiento,/confirm\(confirmacion\.texto\)/);
  assert.match(movimiento,/actualizado\.updated_at!==registroActual\.updated_at/);
  assert.match(finaliza,/No se pudo verificar la dotación vigente/);
  assert.match(repo,/validarDotacionFinalizadoContraEstado\(existente, limpio\)/);
  assert.match(repo,/\.eq\("updated_at", existente.updated_at\)/);
});
