import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { construirTextoInformeEspecial } from "../backend/dominio/informes/informe-especial-salida-texto.js";
import { validarInformeEspecial } from "../backend/dominio/informes/informe-especial-validaciones.js";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const modelos=[["PROCEDIMIENTO","procedimiento"],["CONTROL_SUPERIOR","control-superior"],["ALCOHOLEMIA_POSITIVA","alcoholemia-positiva"],["DECRETO_460_22","decreto-460-22"],["CONTROL_ARMAS","control-armas"],["RETENCION_LICENCIA","retencion-licencia"],["REQUISA_VEHICULAR","requisa-vehicular"]];
for(const [tipo,slug] of modelos)test(tipo+" aislado frontend/backend",async()=>{
 const base="../backend/dominio/informes/modelos/"+slug+"/";
 const salida=await import(base+"salida-texto.js"),validacion=await import(base+"validaciones.js");
 assert.equal(typeof salida.construirInforme,"function");
 assert.equal(typeof validacion.validarModelo,"function");
 assert.ok(fs.existsSync(path.join(root,"frontend/pantallas/informes/modelos",slug,slug+".js")));
 assert.ok(fs.existsSync(path.join(root,"frontend/pantallas/informes/modelos",slug,slug+".html")));
});
test("API histórica conserva casos vacíos y modelo desconocido",()=>{
 assert.equal(construirTextoInformeEspecial(null),"");
 assert.equal(construirTextoInformeEspecial({modelo:"INEXISTENTE"}),"");
 assert.deepEqual(validarInformeEspecial({modelo:"INEXISTENTE",operativo_key:"op",guardia_fecha:"2026-11-07",lugar:"RN168"}),[]);
});
test("PROCEDIMIENTO conserva texto y validación",()=>{
 const informe={modelo:"PROCEDIMIENTO",operativo_key:"op",guardia_fecha:"2026-11-07",lugar:"RN168",formulario:{hecho:"PROCEDIMIENTO POR HECHO DE PRUEBA",lugar_hecho:"RN168",fecha_hecho:"2026-11-07",hora_hecho:"10:20",personal:"Oficial de prueba",moviles:"10139",observaciones:"Sin novedades."}};
 assert.deepEqual(validarInformeEspecial(informe),[]);
 assert.ok(construirTextoInformeEspecial(informe).includes("*HECHO: PROCEDIMIENTO POR HECHO DE PRUEBA*"));
});
