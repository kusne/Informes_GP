import test from "node:test";
import assert from "node:assert/strict";
import {
  obtenerCatalogoRecursosOperativos,
  construirResumenRecursosOperativos
} from "../backend/dominio/compartido/recursos/catalogo-recursos-operativos.js";
import { resolverRecursosInicioParaFinaliza } from "../backend/dominio/finaliza/recursos-finaliza.js";

test("Solo aparecen para seleccionar los alcoholímetros en servicio", () => {
  const catalogo = obtenerCatalogoRecursosOperativos();
  const grupo = catalogo.elementos.find((item) => item.clave === "alcoholimetros");
  assert.deepEqual(grupo.items, ["ARUJ-0239", "ARLM-0536"]);
  assert.equal(grupo.items.includes("ARLM-0652"), false);
});

test("Los informes anteriores conservan el alcoholímetro ARLM-0652", () => {
  const resumen = construirResumenRecursosOperativos({
    elementos: { alcoholimetros: ["ARLM-0652"] }
  });
  assert.match(resumen.elementos, /Alcoholímetros: ARLM-0652/);

  const finaliza = resolverRecursosInicioParaFinaliza({
    datos: {
      recursos_vigentes: {
        personal: ["Oficial A"],
        moviles: [],
        motos: [],
        elementos: { alcoholimetros: ["ARLM-0652"] }
      }
    }
  });
  assert.deepEqual(finaliza.seleccionInicial.elementos.alcoholimetros, ["ARLM-0652"]);
});
