import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { construirTextoInformeEspecial } from "../backend/dominio/informes/informe-especial-salida-texto.js";
import { mapearInformeEspecialParaSupabase } from "../backend/dominio/informes/informe-especial-mapper-supabase.js";
import {
  construirNumeralesSugeridosInforme,
  construirIncrementosSugeridosInforme
} from "../backend/dominio/informes/informe-especial-reglas-numerales.js";

function cargarPersistirEnvioAislado(guardarStub) {
  // Se simula la frontera de persistencia sin escribir actuaciones reales.
  const src = readFileSync(new URL("../api/persistencia-api.js", import.meta.url), "utf8");
  const inicio = src.indexOf("export async function persistirEnvio(");
  const fin = src.indexOf("export function iniciarRealtimeInformesGP", inicio);
  assert.ok(inicio >= 0 && fin > inicio);
  let funcion = src.slice(inicio, fin).replace("export async function", "async function");
  assert.doesNotMatch(funcion, /sinGuardado:\s*true/);
  const fotosImport = 'await import("../backend/infraestructura/supabase/subir-foto-supabase.js")';
  const informesImport = 'await import("../backend/infraestructura/supabase/informes-especiales-v2-repo.js")';
  assert.ok(funcion.includes(fotosImport) && funcion.includes(informesImport));
  funcion = funcion.replace(fotosImport,
    "await Promise.resolve({subirFotosAdjuntasSupabase: fotosStub})")
    .replace(informesImport,
    "await Promise.resolve({guardarInformeEspecialV2: guardarStub})");
  return new Function(
    "modoEnsayoActivo", "inicializarPersistenciaNavegador",
    "normalizarModo", "supabaseDisponible", "fotosStub", "guardarStub",
    funcion + "\nreturn persistirEnvio;"
  )(
    () => false,
    () => ({}),
    valor => String(valor || "").trim().toUpperCase().replaceAll("-", "_").replace(/\s+/g, "_"),
    () => true,
    async ({payload}) => ({payload, fotos: []}),
    guardarStub
  );
}

function informeDePrueba() {
  const base = {
    modelo: "RETENCION_LICENCIA",
    fecha: "2026-11-03T00:25:00Z",
    guardia_fecha: "2026-11-02",
    operativo_key: "OPERATIVO-PRUEBA",
    lugar: "RN 168 KM18",
    formulario: {
      fecha_hecho: "2026-11-02",
      hora_hecho: "21:25",
      motivo_licencia: "VENCIDA_MAS_6_MESES",
      retencion_licencia: true,
      numero_acta: "070083607",
      juzgado: "RINCON"
    }
  };
  const texto = construirTextoInformeEspecial(base);
  const payload = mapearInformeEspecialParaSupabase({...base, texto});
  return {base, texto, payload};
}

test("RETENCION_LICENCIA se guarda para Actuaciones registradas y elevación", async () => {
  const {texto, payload} = informeDePrueba();
  assert.match(texto, /RETENCI[ÓO]N DE LICENCIA/i);
  assert.doesNotMatch(texto, /\*JUZGADO:\*/);
  assert.equal(payload.tipo_informe, "RETENCION_LICENCIA");
  assert.equal(payload.guardia_fecha, "2026-11-02");
  assert.equal(payload.datos.juzgado, "RINCON");
  const guardados = [];
  const persistir = cargarPersistirEnvioAislado(async data => {
    guardados.push(data);
    return {saltado: false, mensaje: "Informe guardado en Supabase V2."};
  });
  const resultado = await persistir({modo: "INFORMES", payload});
  assert.equal(resultado.ok, true);
  assert.equal(resultado.saltado, false);
  assert.equal(resultado.sinGuardado, undefined);
  assert.equal(guardados.length, 1);
  assert.equal(guardados[0].informe_key, payload.informe_key);
  assert.equal(guardados[0].datos.juzgado, "RINCON");
});

test("Una falla al guardar la retención no se informa como éxito", async () => {
  const {payload} = informeDePrueba();
  const persistir = cargarPersistirEnvioAislado(async () => {
    throw Error("Supabase rechazó el guardado");
  });
  await assert.rejects(
    persistir({modo: "INFORMES", payload}),
    /Supabase rechazó el guardado/
  );
});

test("La retención autónoma no suma otros numerales ni resultados semanales", () => {
  const {base} = informeDePrueba();
  assert.deepEqual(construirNumeralesSugeridosInforme(base), []);
  assert.deepEqual(construirIncrementosSugeridosInforme(base), {});
});

test("La alcoholemia con medida de retención conserva su salida institucional", () => {
  const texto = construirTextoInformeEspecial({
    modelo: "ALCOHOLEMIA_POSITIVA",
    lugar: "RN 168 KM18",
    fecha_informe: "2026-10-29", hora_informe: "20:30",
    formulario: {
      medida_retencion: true, resultado: "0,64",
      tipo_vehiculo: "SEDAN", clase: "B2 27762328", juzgado: "RINCON"
    },
    calculos: {sancionable: true, resultado: 0.64, codigo_sancionable: "2016"}
  });
  assert.match(texto, /RETENCIÓN DE LICENCIA DE CONDUCIR/);
  assert.doesNotMatch(texto, /\*JUZGADO:\*/);
});
