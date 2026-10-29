import test from "node:test";
import assert from "node:assert/strict";
import { normalizarPersonalSalidaFinaliza } from "../backend/dominio/finaliza/recursos-finaliza.js";
import { construirTextoInformeEspecial } from "../backend/dominio/informes/informe-especial-salida-texto.js";
import { construirTextoFinalizadoBase } from "../backend/dominio/finaliza/finalizado-salida-texto-base.js";
import { construirTextoInicioBase } from "../backend/dominio/inicia/inicio-salida-texto-base.js";
import { formatearTituloOperativo, formatearLugarOperativo } from "../backend/dominio/compartido/texto/formato-titulos-operativos.js";

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


test("FINALIZA colaboración EPE: caso real de 29/10 imprime título y QTH con mayúsculas correctas", () => {
  const operativo = {
    tipo_nombre: "COLABORACIÓN EN ORDENAMIENTO POR TRABAJO DE LA EMPRESA PROVINCIAL DE LA ENERGÍA",
    tipo_operativo: "ORDENAMIENTO",
    lugar: "AV. CIRCUNVALACIÓN OESTE Y CALLE MENDOZA",
    datos: {ordenes_origen: ["O. OP G.P N°2127/26"]}
  };
  const formulario = {
    personal: "Suboficial de Policia Aquino Francisco Luis\nSuboficial de Policia Delgado Yasmila Ailen",
    moviles_motos: "12502",
    elementos: "Escopetas: /\nHt: /\nPda: /\nImpresoras: /\nAlómetros: /\nAlcoholímetros: /",
    observaciones: "Siendo las 15:45 entrevistamos al señor santiago suarez quien informa que se da por finalizado dicho servicio sin novedad."
  };
  const salida = construirTextoFinalizadoBase({
    operativo, tipo_operativo: "ORDENAMIENTO",
    fecha_operativo: "2026-10-29",
    hora_inicio: "07:00", hora_fin: "17:00",
    lugar: operativo.lugar, formulario
  });
  const esperado = [
    "*Policia de la Provincia de Santa Fe - Direccion General Guardia Provincial*",
    "*Brigada Motorizada Centro Norte*",
    "*Tercio Charlie*",
    "",
    "*Finaliza Colaboración en Ordenamiento por Trabajo de la Empresa Provincial de la Energía O. OP G.P N°2127/26*",
    "",
    "*Fecha:* 29/10/2026",
    "*Horario:* 07:00 A 17:00 HS",
    "*Lugar:* Av. Circunvalación Oeste Y Calle Mendoza",
    "",
    "*Personal Policial:*",
    "Suboficial de Policia Aquino Francisco Luis",
    "Suboficial de Policia Delgado Yasmila Ailen",
    "",
    "*Móviles:* 12502",
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
    "Siendo las 15:45 entrevistamos al señor santiago suarez quien informa que se da por finalizado dicho servicio sin novedad."
  ].join("\n");
  assert.equal(salida, esperado);
  assert.doesNotMatch(salida, /ColaboraciÓN|CircunvalaciÓN|EnergÍA/);
  assert.doesNotMatch(salida, /\*Resultados:\*/);
});

test("INICIO y FINALIZADO usan una regla común para títulos con tildes y siglas", () => {
  const nombre = "COLABORACIóN EN ORDENAMIENTO POR TRABAJO DE LA EMPRESA PROVINCIAL DE LA ENERGÍa";
  const titulo = "Colaboración en Ordenamiento por Trabajo de la Empresa Provincial de la Energía";
  assert.equal(formatearTituloOperativo(nombre), titulo);
  assert.equal(formatearTituloOperativo("OCV Y DICEP"), "OCV Y DICEP");
  assert.equal(formatearTituloOperativo("OCV Y ALCOHOLEMIA"), "OCV Y Alcoholemia");
  assert.equal(formatearLugarOperativo("AV. CIRCUNVALACIóN OESTE Y CALLE MENDOZA"),
    "Av. Circunvalación Oeste Y Calle Mendoza");
  const inicio = construirTextoInicioBase({
    operativo:{tipo_nombre:nombre, datos:{ordenes_origen:["O. OP G.P N°2127/26"]}},
    fecha_operativo:"2026-10-29",hora_inicio:"07:00",hora_fin:"17:00",
    lugar:"AV. CIRCUNVALACIóN OESTE Y CALLE MENDOZA",
    formulario:{personal:"Suboficial de Policia Aquino Francisco Luis",moviles_motos:"12502"}
  });
  assert.match(inicio, /\*Inicia Colaboración en Ordenamiento por Trabajo de la Empresa Provincial de la Energía O\. OP G\.P N°2127\/26\*/);
  assert.match(inicio, /\*Lugar:\* Av\. Circunvalación Oeste Y Calle Mendoza/);
});
