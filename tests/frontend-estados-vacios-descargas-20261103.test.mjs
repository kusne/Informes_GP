import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolverTextoSinItems } from "../frontend/pantallas/pantalla-principal/componentes/selector-operativo-contextual/selector-operativo-contextual.js";

const leer = ruta => readFileSync(new URL(ruta, import.meta.url), "utf8");

test("INICIO sin programados muestra exactamente el texto solicitado", () => {
 assert.equal(resolverTextoSinItems("INICIA"), "NO HAY OPERATIVOS A INICIAR");
});

test("ACOPLE, RELEVO, RETIRO y FINALIZADO comparten aviso de ausencia de operativos EN CURSO", () => {
 for (const modo of ["ACOPLE", "RELEVO", "RETIRO", "FINALIZA"])
  assert.equal(resolverTextoSinItems(modo), "NO HAY OPERATIVOS EN CURSO", modo);
});

test("INFORMES y modos ajenos mantienen sus avisos originales", () => {
 assert.equal(resolverTextoSinItems("INFORMES"), "No hay modelos de informes disponibles.");
 assert.equal(resolverTextoSinItems("DESCONOCIDO"), "No hay opciones disponibles.");
});

test("selector de respaldo refleja los mensajes exactos cuando falla el módulo principal", () => {
 const src = leer("../frontend/pantallas/pantalla-principal/pantalla-principal.js");
 assert.match(src, /modo === "INICIA" \? "NO HAY OPERATIVOS A INICIAR"/);
 assert.match(src, /\["ACOPLE","RELEVO","RETIRO","FINALIZA"\]\.includes\(modo\) \? "NO HAY OPERATIVOS EN CURSO"/);
});

test("botón Descarga / Actas de utilizadad coincide en la vista principal y el shell inicial", () => {
 for (const path of ["../frontend/pantallas/pantalla-principal/pantalla-principal.html", "../index.html"]) {
  const html=leer(path);
  const link=html.match(/<a href="\.\/descargas\.html" class="igp-descarga-actas"[^>]*>[\s\S]*?<\/a>/);
  assert.ok(link, path + " conserva enlace de descargas");
  assert.match(link[0], /<span>Descarga<\/span><span>Actas de utilizadad<\/span>/);
  assert.match(link[0], /flex-direction:column/);
  assert.match(link[0], /background:#0b3d91/);
  assert.match(link[0], /color:#ffffff/);
  assert.doesNotMatch(link[0], /#facc15|DESCARGAS DE ACTAS/);
 }
});
