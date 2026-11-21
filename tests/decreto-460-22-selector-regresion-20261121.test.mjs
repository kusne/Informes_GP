import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  obtenerOperativosDisponibles46022
} from "../backend/aplicacion/informes/decreto-460-22-operativos-disponibles.js";

const interfaz = readFileSync(new URL("../frontend/pantallas/informes/informes.js", import.meta.url), "utf8");

test("460/22 indica la fuente real cuando la guardia está vigente y no tiene INICIO", async () => {
  let invocaciones = 0;
  const consulta = async () => ({
    ok: true, json: async () => [{guardia_fecha:"2026-11-21",estado:"VIGENTE"}]
  });
  const resultado = await obtenerOperativosDisponibles46022({
    consultar: consulta,
    leerOperativos: async ({guardia_fecha}) => {
      invocaciones++;
      assert.equal(guardia_fecha, "2026-11-21");
      return [];
    },
    ahora: new Date("2026-11-21T13:00:00-03:00"), ensayo:false
  });
  assert.equal(resultado.estado,"VIGENTE");
  assert.equal(resultado.guardiaFecha,"2026-11-21");
  assert.deepEqual(resultado.operativos,[]);
  assert.equal(invocaciones,1);
  assert.match(interfaz,/Primero registrá INICIO en Informes GP/);
  assert.match(interfaz,/btnActualizarOperativos46022/);
});

test("460/22 no mezcla finalizados históricos con una guardia vigente sin iniciados", async () => {
  const resultado = await obtenerOperativosDisponibles46022({
    consultar: async () => ({ ok:true, json:async()=>[
      {guardia_fecha:"2026-11-20",estado:"FINALIZADA"},
      {guardia_fecha:"2026-11-21",estado:"VIGENTE"}
    ] }),
    leerOperativos: async () => [
      {operativo_key:"historico",guardia_fecha:"2026-11-20",estado:"FINALIZADO"},
      {operativo_key:"actual",guardia_fecha:"2026-11-21",estado:"EN_CURSO",created_at:"2026-11-21T13:30:00Z"}
    ],
    ahora: new Date("2026-11-21T13:00:00-03:00"), ensayo:false
  });
  assert.deepEqual(resultado.operativos.map(op=>op.operativo_key),["actual"]);
});

test("UI 460/22 mantiene identidad de selección durante consultas y cambios de guardia", () => {
  assert.match(interfaz, /await refrescarOperativos46022\(host, \{ claveSolicitada: claveElegida \}\)/);
  assert.match(interfaz, /secuencia !== secuenciaConsulta46022/);
  assert.match(interfaz, /estadoInforme\.guardiaFecha46022 !== \(resultado\.guardiaFecha \|\| ""\)/);
  assert.match(interfaz, /String\(op\.guardia_fecha\) === String\(estadoInforme\.guardiaFecha46022\)/);
  assert.match(interfaz, /actualizarOperativoInformeEspecial\(\{ form, operativoSeleccionado: null \}\)/);
  assert.match(interfaz, /if \(cambio \|\| forzar\)/);
});
