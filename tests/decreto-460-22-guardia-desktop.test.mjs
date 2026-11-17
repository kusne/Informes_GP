import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  resolverGuardiaDisponible46022,
  obtenerOperativosDisponibles46022
} from "../backend/aplicacion/informes/decreto-460-22-operativos-disponibles.js";

const AHORA = new Date("2026-11-17T14:30:00-03:00");
const OP = (clave, guardia, estado, fecha) => ({
  operativo_key: clave,
  guardia_fecha: guardia,
  estado,
  created_at: fecha,
  lugar: "RN 168 KM 18"
});
function respuesta(filas) {
  return async (url, opciones) => {
    assert.match(url, /bmzcn_guardias_estado_informes_gp_v1/);
    assert.match(url, /select=guardia_fecha%2Cestado/);
    assert.equal(opciones.headers.Accept, "application/json");
    return { ok: true, json: async () => filas };
  };
}
test("460/22 consulta sólo la guardia de Desktop, con finalizados de la misma guardia", async () => {
  let fechaConsultada = "";
  const result = await obtenerOperativosDisponibles46022({
    consultar: respuesta([
      {guardia_fecha:"2026-11-16",estado:"FINALIZADA"},
      {guardia_fecha:"2026-11-17",estado:"VIGENTE"}
    ]),
    leerOperativos: async ({guardia_fecha}) => {
      fechaConsultada = guardia_fecha;
      return [
        OP("anterior","2026-11-16","FINALIZADO","2026-11-16T11:00:00Z"),
        OP("primero","2026-11-17","FINALIZADO","2026-11-17T10:00:00Z"),
        OP("segundo","2026-11-17","EN_CURSO","2026-11-17T12:00:00Z")
      ];
    },
    ensayo: false, ahora: AHORA
  });
  assert.equal(fechaConsultada, "2026-11-17");
  assert.equal(result.estado, "VIGENTE");
  assert.deepEqual(result.operativos.map(op=>op.operativo_key), ["segundo","primero"]);
});
test("460/22 no da operativos luego del cierre confirmado", async () => {
  let llamadas=0;
  const result = await obtenerOperativosDisponibles46022({
    consultar: respuesta([{guardia_fecha:"2026-11-17",estado:"FINALIZADA"}]),
    leerOperativos: async()=>{llamadas++;return [];},
    ensayo: false, ahora: AHORA
  });
  assert.equal(result.estado, "FINALIZADA");
  assert.deepEqual(result.operativos, []);
  assert.equal(llamadas, 0);
});
test("460/22 reconoce una guardia extendida después de las 06:00", async () => {
  const result = await obtenerOperativosDisponibles46022({
    consultar: respuesta([{guardia_fecha:"2026-11-16",estado:"EXTENDIDA"}]),
    leerOperativos: async()=>[OP("extendido","2026-11-16","FINALIZADO","2026-11-17T07:00:00Z")],
    ensayo: false, ahora: AHORA
  });
  assert.equal(result.estado, "EXTENDIDA");
  assert.equal(result.operativos[0].operativo_key, "extendido");
});
test("460/22 bloqueo preventivo, sin control o sin conexión impiden recuperar históricos", async () => {
  for (const [filas,esperado] of [
    [[{guardia_fecha:"2026-11-15",estado:"BLOQUEO_PREVENTIVO"}],"BLOQUEO_PREVENTIVO"],
    [[], "SIN_GUARDIA"]
  ]) {
    const result = await obtenerOperativosDisponibles46022({
      consultar: respuesta(filas),
      leerOperativos: async()=>{throw Error("No debe consultarse");},
      ensayo: false, ahora: AHORA
    });
    assert.equal(result.estado, esperado);
    assert.deepEqual(result.operativos, []);
  }
  const desconectado = await obtenerOperativosDisponibles46022({
    consultar: async()=>{throw Error("Sin red");}, ensayo:false, ahora: AHORA
  });
  assert.equal(desconectado.estado, "SIN_VERIFICAR");
  assert.deepEqual(desconectado.operativos, []);
});
test("460/22 prioriza la guardia anterior no cerrada según Desktop", () => {
  const guardia = resolverGuardiaDisponible46022([
    {guardia_fecha:"2026-11-17",estado:"VIGENTE"},
    {guardia_fecha:"2026-11-16",estado:"EXTENDIDA"}
  ]);
  assert.equal(guardia.guardiaFecha, "2026-11-16");
});
test("460/22 queda encapsulado: selector sin etiqueta, juzgado Rincón y actualización del cierre", () => {
  const interfaz = readFileSync(new URL("../frontend/pantallas/informes/informes.js", import.meta.url),"utf8");
  const html = readFileSync(new URL("../frontend/pantallas/informes/modelos/decreto-460-22/decreto-460-22.html", import.meta.url),"utf8");
  const script = readFileSync(new URL("../frontend/pantallas/informes/modelos/decreto-460-22/decreto-460-22.js", import.meta.url),"utf8");
  const sql = readFileSync(new URL("../backend/infraestructura/supabase/guardia-estado-publico-informes-gp-46022.sql", import.meta.url),"utf8");
  assert.match(interfaz, /es460 \? "" : '<label for="selectorOperativoDentroInforme">Últimos Operativos<\/label>'/);
  assert.match(interfaz, /setInterval\(\(\) => void refrescar\(\), 15000\)/);
  assert.match(interfaz, /actualizarOperativoInformeEspecial\(\{ form, operativoSeleccionado: null \}\)/);
  assert.match(script, /lugar\.readOnly = false/);
  assert.match(html, /<option value="RINCON" selected>RINCÓN<\/option>/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /grant select .* to anon, authenticated/);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete).* to anon/);
});
