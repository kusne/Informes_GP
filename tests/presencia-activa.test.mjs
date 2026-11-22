import test from "node:test";
import assert from "node:assert/strict";
import {
  prepararCambioPresenciaActiva, obtenerDetallePresenciaActiva, estaEnPresenciaActiva, MOTIVOS_PRESENCIA_ACTIVA
} from "../backend/dominio/presencia-activa/presencia-activa.js";

const operativo = () => ({
  operativo_key: "guardia-2026-11-22-001",
  guardia_fecha: "2026-11-22",
  estado: "EN_CURSO",
  tipo_operativo: "OCV",
  tipo_nombre: "OCV y Alcoholemia",
  hora_inicio: "06:30",
  hora_fin: "08:30",
  lugar: "RN 168 KM 7,5",
  personal: "Subinspector Mariaux A.\nSuboficial de Policia Aquino Francisco",
  moviles_motos: "8105",
  elementos: "Escopetas: /\nHt: /\nPda: 67 / 68\nImpresoras: N°64\nAlómetros: ARTL-0425\nAlcoholímetros: ARLM-0536",
  datos: {
    ordenes_origen: ["O.S. G.P N°2258/26", "O.OP N°2340/26"],
    inicio_snapshot: {
      tipo_nombre: "OCV y Alcoholemia",
      personal: "Subinspector Mariaux A.\nSuboficial de Policia Aquino Francisco",
      moviles_motos: "8105",
      elementos: "Escopetas: /\nHt: /\nPda: 67 / 68\nImpresoras: N°64\nAlómetros: ARTL-0425\nAlcoholímetros: ARLM-0536"
    }
  }
});

test("Presencia Activa conserva el inicio, la orden principal y las referencias", () => {
  const row = operativo();
  const anterior = structuredClone(row);
  const salida = prepararCambioPresenciaActiva({
    operativo: row, accion: "INICIAR", motivo: "LLUVIA",
    hora_reporte: "07:05", adjunta_vista: true,
    fecha_evento: "2026-11-22T10:05:00.000Z"
  });
  assert.match(salida.texto, /Presencia Activa OCV y Alcoholemia/i);
  assert.match(salida.texto, /2258\/26/);
  assert.match(salida.texto, /2340\/26/);
  assert.match(salida.texto, /Horario:\* 07:05/);
  assert.match(salida.texto, /Subinspector Mariaux/);
  assert.match(salida.texto, /8105/);
  assert.match(salida.texto, /ARTL-0425/);
  for (const renglon of ["Escopetas: /", "Ht: /", "Pda: 67 / 68", "Impresoras: N°64", "Alómetros: ARTL-0425", "Alcoholímetros: ARLM-0536"]) {
    assert.ok(salida.texto.includes(renglon), "El inventario debe heredar sin modificaciones: " + renglon);
  }
  assert.match(salida.texto, /por lluvia/);
  assert.match(salida.texto, /Se adjunta vista fotográfica/);
  assert.equal(salida.evento.tipo, "PRESENCIA_ACTIVA");
  assert.deepEqual(row, anterior, "Formatear nunca debe alterar el operativo almacenado");
});

test("Un operativo en Presencia Activa puede retomar actividad sin cambiar su identidad", () => {
  const row = operativo();
  row.datos.presencia_activa = { activa: true, motivo: "lluvia" };
  assert.equal(estaEnPresenciaActiva(row), true);
  const salida = prepararCambioPresenciaActiva({
    operativo: row, accion: "RETOMAR",
    hora_reporte: "07:45", fecha_evento: "2026-11-22T10:45:00.000Z"
  });
  assert.equal(salida.evento.tipo, "RETOMA_OPERATIVO");
  assert.match(salida.texto, /retoma el operativo con normalidad/);
  assert.match(salida.texto, /2340\/26/);
});

test("Impide duplicar transiciones y guardar motivos o horarios inválidos", () => {
  const row = operativo();
  const iniciar = extra => prepararCambioPresenciaActiva({
    operativo: row, accion: "INICIAR", motivo: "LLUVIA",
    hora_reporte: "08:00", ...extra
  });
  assert.throws(() => iniciar({motivo:"OTROS"}), /otro motivo/);
  assert.throws(() => iniciar({hora_reporte:"25:90"}), /hora válida/);
  assert.throws(() => prepararCambioPresenciaActiva({
    operativo: row, accion: "RETOMAR", hora_reporte: "08:00"
  }), /ya se desarrolla normalmente/);
  row.estado = "FINALIZADO";
  assert.throws(() => iniciar(), /EN CURSO/);
  assert.equal(MOTIVOS_PRESENCIA_ACTIVA.length, 5);
});

test("Otro motivo personalizado e insumos vigentes se conservan en el informe", () => {
  const row = operativo();
  row.datos.recursos_vigentes = {
    personal: ["Subinspector Mariaux A.", "Suboficial de Policia Delgado Yasmila Ailen"],
    moviles: ["8105"], motos: [],
    elementos: {
      escopetas: [], ht: [], pda: ["67", "68"],
      impresoras: ["N°64"], alometros: ["ARTL-0425"],
      alcoholimetros: ["ARLM-0536"]
    }
  };
  const salida = prepararCambioPresenciaActiva({
    operativo: row, accion: "INICIAR", motivo: "OTROS",
    otro_motivo: "desperfecto del equipo de control",
    hora_reporte: "07:22", fecha_evento: "2026-11-22T10:22:00.000Z"
  });
  assert.match(salida.texto, /por desperfecto del equipo de control/);
  assert.match(salida.texto, /Delgado Yasmila Ailen/);
  assert.match(salida.texto, /ARLM-0536/);
  assert.doesNotMatch(salida.texto, /Se adjunta vista fotográfica/);
});

test("RETIRO no vuelve a incorporar móviles ni elementos del INICIO", () => {
  const row = operativo();
  row.datos.recursos_vigentes = {
    personal: ["Subinspector Mariaux A."],
    moviles: [], motos: [],
    elementos: {
      escopetas: [], ht: [], pda: [],
      impresoras: [], alometros: [], alcoholimetros: []
    }
  };
  const detalle = obtenerDetallePresenciaActiva(row);
  assert.equal(detalle.moviles, "/");
  assert.equal(detalle.elementos, [
    "Escopetas: /", "Ht: /", "Pda: /",
    "Impresoras: /", "Alómetros: /", "Alcoholímetros: /"
  ].join("\n"));
  assert.doesNotMatch(detalle.personal, /Aquino Francisco/);
  const informe = prepararCambioPresenciaActiva({
    operativo: row, accion: "INICIAR", motivo: "LLUVIA",
    hora_reporte: "07:05"
  }).texto;
  assert.match(informe, /\*Móviles:\* \/\n/);
  assert.doesNotMatch(informe, /8105|ARTL-0425|ARLM-0536|Pda: 67/);
});

test("Los RELEVOS y ACOPLES se reflejan sin repetir el inventario anterior", () => {
  const row = operativo();
  row.datos.recursos_vigentes = {
    personal: ["Suboficial de Policia Delgado Yasmila Ailen"],
    moviles: ["8107"], motos: [],
    elementos: {
      escopetas: [], ht: ["N°06"], pda: ["68"],
      impresoras: ["N°64"], alometros: [],
      alcoholimetros: ["ARLM-0536"]
    }
  };
  const detalle = obtenerDetallePresenciaActiva(row);
  assert.match(detalle.personal, /Delgado Yasmila/);
  assert.doesNotMatch(detalle.personal, /Aquino Francisco/);
  assert.equal(detalle.moviles, "8107");
  assert.match(detalle.elementos, /Ht: N°06/);
  assert.match(detalle.elementos, /Alómetros: \/$/m);
});

test("Un INICIO histórico con presencia_activa=true habilita retorno a normalidad", () => {
  const row = operativo();
  row.datos.presencia_activa = true;
  assert.equal(estaEnPresenciaActiva(row), true);
  assert.equal(prepararCambioPresenciaActiva({
    operativo: row, accion: "RETOMAR", hora_reporte: "08:00"
  }).evento.tipo, "RETOMA_OPERATIVO");
});
