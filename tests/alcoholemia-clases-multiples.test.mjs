import test from "node:test";
import assert from "node:assert/strict";
import {CLASES_LICENCIA_PERMITIDAS, interpretarLicenciaDniAlcoholemia as leer} from "../backend/dominio/informes/licencia-dni-alcoholemia.js";
test("Catálogo exacto de clases",()=>{
 const expected="A1.1 A1.2 A1.3 A1.4 A2.1 A2.2 A3 B1 B2 C1 C2 C3 D1 D2 D3 D4 E1 E2 E3 F G1 G2 G3".split(" ");
 assert.deepEqual(CLASES_LICENCIA_PERMITIDAS,expected);
 for(const c of expected) assert.deepEqual([...leer(c+" 27762328").clases],[c]);
});
test("Varias clases y un solo documento",()=>{
 const info=leer("A 1.1, A1.3 y B 2 / C1; D4 + E2, F G3 27.762.328");
 assert.deepEqual([...info.clases],["A1.1","A1.3","B2","C1","D4","E2","F","G3"]);
 assert.equal(info.dni,"27762328");
});
test("Validación estricta y compatibilidad",()=>{
 for(const v of ["A1.5 27762328","G 27762328","A1.1 B2 2776"])assert.equal(leer(v).valido,false);
 assert.deepEqual([...leer("B1 B1 G2 27762328").clases],["B1","G2"]);
 assert.equal(leer("27762328").tipo,"DNI");
 assert.equal(leer("B2 27762328").tipo,"LICENCIA");
});
