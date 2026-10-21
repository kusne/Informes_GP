import test from "node:test";
import assert from "node:assert/strict";
import { normalizarPersonalSalidaFinaliza } from "../backend/dominio/finaliza/recursos-finaliza.js";
import { construirTextoInformeEspecial } from "../backend/dominio/informes/informe-especial-salida-texto.js";

test("FINALIZADO ordena por función de supervisión y luego por grado sin cambiar dotación", () => {
  const original = [
    "Subinspector Mariaux Alejandra Anahi",
    "Suboficial de Policia Lopez Carlos Daniel",
    "Suboficial de Policia Aquino Francisco Luis",
    "Suboficial de Policia Benavidez Claudio Uriel",
    "Subcomisario Choque José María"
  ].join("\n");
  const resultado = normalizarPersonalSalidaFinaliza(original).split("\n");
  assert.deepEqual(resultado, [
    "Subcomisario Choque José María",
    "Subinspector Mariaux Alejandra Anahi",
    "Suboficial de Policia Lopez Carlos Daniel",
    "Suboficial de Policia Aquino Francisco Luis",
    "Suboficial de Policia Benavidez Claudio Uriel"
  ]);
  // El texto de origen no se altera por el ordenado de presentación.
  assert.ok(original.startsWith("Subinspector"));
});

test("Prioriza cargo JEFE/SUBJEFE, reconoce alias y evita duplicación", () => {
  const resultado = normalizarPersonalSalidaFinaliza([
    "Suboficial de Policia Lopez Carlos Daniel",
    "Inspector Marutti Gastón",
    "SUBJEFE",
    "JEFE",
    "Subcomisario Choque Jose Maria",
    "Subinspector Mariaux Alejandra"
  ]);
  const r = resultado.split("\n");
  assert.equal(r[0], "Subcomisario Choque José María");
  assert.equal(r[1], "Inspector Fertonani Sebastián");
  assert.equal(r[2], "Inspector Marutti Gastón");
  assert.equal(r[3], "Subinspector Mariaux Alejandra");
  assert.equal(r[4], "Suboficial de Policia Lopez Carlos Daniel");
  assert.equal(r.length, 5);
});

test("CONTROL SUPERIOR informa lugar, hora real y operativo, sin horario programado", () => {
  const informe = construirTextoInformeEspecial({
    modelo: "CONTROL_SUPERIOR",
    lugar: "RN 168 KM7,5",
    hora_informe: "11:22",
    fecha_informe: "2026-10-21",
    hora_inicio: "10:00",
    hora_fin: "12:00",
    operativo: {
      tipo_nombre: "Operativo De Control Vehicular",
      hora_inicio: "10:00",
      hora_fin: "12:00",
      datos: { inicio_snapshot: {
        personal: "Subinspector Mariaux Alejandra Anahi\nSuboficial de Policia Lopez Carlos Daniel",
        moviles_motos: "10139 / 9088 / 9091"
      }, ordenes_origen: ["O.S. G.P N°2067/26"] }
    },
    formulario: { autoridad_jefe: true, movil_12428: true, se_acopla: true }
  });
  assert.match(informe, /\*MOTIVO: CONTROL SUPERIOR\*/);
  assert.match(informe, /\*HORA:\* 11:22 Hs/);
  assert.match(informe, /\*FECHA:\* 21\/10\/2026/);
  assert.match(informe, /\*OPERATIVO:\*.*2067\/26/);
  assert.match(informe, /\*PERSONAL POLICIAL:\*/);
  assert.match(informe, /\*MÓVIL\/ES:\* 10139 \/ 9088 \/ 9091/);
  assert.doesNotMatch(informe, /HORARIO OPERATIVO/i);
  assert.match(informe, /se acopla al operativo/);
});
