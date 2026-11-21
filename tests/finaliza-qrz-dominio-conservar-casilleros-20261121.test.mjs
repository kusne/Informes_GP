import test from "node:test";
import assert from "node:assert/strict";
import { iniciarResultadosDinamicosFinaliza, sincronizarQrzDominio } from "../frontend/pantallas/finaliza/componentes/resultados-dinamicos/resultados-dinamicos.js";

class FakeInput {
  constructor() {
    this.type = "text";
    this.value = "";
    this.dataset = {};
    this.handlers = new Map();
    this.parent = null;
  }
  addEventListener(tipo, handler) {
    if (!this.handlers.has(tipo)) this.handlers.set(tipo, []);
    this.handlers.get(tipo).push(handler);
  }
  emitir(tipo) {
    for (const handler of this.handlers.get(tipo) || []) handler({ target: this });
  }
  remove() {
    if (!this.parent) return;
    const lista = this.parent.children;
    const indice = lista.indexOf(this);
    if (indice >= 0) lista.splice(indice, 1);
    this.parent = null;
  }
}

class FakeHost {
  constructor() { this.children = []; }
  querySelectorAll(selector) {
    assert.equal(selector, 'input[type="text"]');
    return this.children.filter(x => x.type === "text");
  }
  appendChild(nodo) {
    this.children.push(nodo);
    nodo.parent = this;
  }
}

function crearFormulario() {
  const qrzCasilleros = new FakeHost();
  const dominioCasilleros = new FakeHost();
  const refs = {
    qrz: { value: "10" },
    dominio: { value: "10" },
    qrzCasilleros,
    dominioCasilleros,
    hiddenQrz: { value: "" },
    hiddenDominio: { value: "" }
  };
  return refs;
}

test("FINALIZADO: QRZ 10 a 11 agrega sólo una celda y conserva los 10 DNI", () => {
  const anterior = globalThis.document;
  globalThis.document = { createElement: () => new FakeInput() };
  try {
    const refs = crearFormulario();
    sincronizarQrzDominio(refs);
    assert.equal(refs.qrzCasilleros.children.length, 10);
    const originales = [...refs.qrzCasilleros.children];
    originales.forEach((input, indice) => {
      input.value = String(30000000 + indice);
      input.emitir("input");
    });
    refs.qrz.value = "11";
    sincronizarQrzDominio(refs);
    assert.equal(refs.qrzCasilleros.children.length, 11);
    assert.deepEqual(refs.qrzCasilleros.children.slice(0,10), originales,
      "no deben reconstruirse las primeras diez celdas");
    assert.deepEqual(refs.qrzCasilleros.children.slice(0,10).map(x => x.value),
      originales.map(x => x.value));
    assert.equal(refs.qrzCasilleros.children[10].value, "");
    assert.deepEqual(JSON.parse(refs.hiddenQrz.value),
      [...originales.map(x => x.value), ""]);
  } finally { globalThis.document = anterior; }
});

test("FINALIZADO: Dominio 10 a 11 conserva textos escritos y agrega una sola celda", () => {
  const anterior = globalThis.document;
  globalThis.document = { createElement: () => new FakeInput() };
  try {
    const refs = crearFormulario();
    sincronizarQrzDominio(refs);
    const originales = [...refs.dominioCasilleros.children];
    originales.forEach((input, indice) => {
      input.value = "AA" + String(100 + indice) + "QZ AUTO";
      input.emitir("input");
    });
    refs.dominio.value = "11";
    sincronizarQrzDominio(refs);
    assert.deepEqual(refs.dominioCasilleros.children.slice(0, 10), originales);
    assert.deepEqual(JSON.parse(refs.hiddenDominio.value).slice(0, 10),
      originales.map(x => x.value));
    assert.equal(refs.dominioCasilleros.children[10].value, "");
  } finally { globalThis.document = anterior; }
});

test("FINALIZADO: reducir cantidad conserva los restantes y recuperar casilleros restaura datos", () => {
  const anterior = globalThis.document;
  globalThis.document = { createElement: () => new FakeInput() };
  try {
    const refs = crearFormulario();
    sincronizarQrzDominio(refs);
    refs.qrzCasilleros.children.forEach((input, indice) => {
      input.value = String(31000000 + indice);
      input.emitir("input");
    });
    refs.dominioCasilleros.children.forEach((input, indice) => {
      input.value = "AB" + String(200 + indice);
      input.emitir("input");
    });
    const primerosQrz = [...refs.qrzCasilleros.children.slice(0, 7)];
    const primerosDominios = [...refs.dominioCasilleros.children.slice(0, 8)];
    refs.qrz.value = "7";
    refs.dominio.value = "8";
    sincronizarQrzDominio(refs);
    assert.equal(refs.qrzCasilleros.children.length, 7);
    assert.equal(refs.dominioCasilleros.children.length, 8);
    assert.deepEqual(refs.qrzCasilleros.children, primerosQrz);
    assert.deepEqual(refs.dominioCasilleros.children, primerosDominios);
    assert.equal(JSON.parse(refs.hiddenQrz.value).length, 7);
    assert.equal(JSON.parse(refs.hiddenDominio.value).length, 8);

    refs.qrz.value = "10";
    refs.dominio.value = "10";
    sincronizarQrzDominio(refs);
    assert.deepEqual(refs.qrzCasilleros.children.map(x => x.value),
      Array.from({length:10}, (_,i)=>String(31000000+i)));
    assert.deepEqual(refs.dominioCasilleros.children.map(x => x.value),
      Array.from({length:10}, (_,i)=>"AB"+String(200+i)));
    assert.equal(JSON.parse(refs.hiddenQrz.value).length, 10);
    assert.equal(JSON.parse(refs.hiddenDominio.value).length, 10);
  } finally { globalThis.document = anterior; }
});

test("FINALIZADO: un nuevo formulario no hereda DNI ni dominios del anterior", () => {
  const anterior = globalThis.document;
  globalThis.document = { createElement: () => new FakeInput() };
  try {
    const a = crearFormulario();
    sincronizarQrzDominio(a);
    a.qrzCasilleros.children[0].value = "12345678";
    a.dominioCasilleros.children[0].value = "AB123CD";
    sincronizarQrzDominio(a);
    const b = crearFormulario();
    sincronizarQrzDominio(b);
    assert.equal(b.qrzCasilleros.children[0].value, "");
    assert.equal(b.dominioCasilleros.children[0].value, "");
    assert.equal(JSON.parse(b.hiddenQrz.value)[0], "");
    assert.equal(JSON.parse(b.hiddenDominio.value)[0], "");
  } finally { globalThis.document = anterior; }
});

test("FINALIZADO: al escribir en un casillero se actualiza el JSON y se sanitiza", () => {
  const anterior = globalThis.document;
  globalThis.document = { createElement: () => new FakeInput() };
  try {
    const refs = crearFormulario();
    refs.qrz.value = "1";
    refs.dominio.value = "1";
    refs.notificar = () => sincronizarQrzDominio(refs);
    sincronizarQrzDominio(refs);
    const qrz = refs.qrzCasilleros.children[0];
    const dominio = refs.dominioCasilleros.children[0];
    qrz.value = "34.567.890";
    qrz.emitir("input");
    dominio.value = "ab-123-cd";
    dominio.emitir("input");
    assert.equal(qrz.value, "34567890");
    assert.equal(dominio.value, "AB123CD");
    assert.deepEqual(JSON.parse(refs.hiddenQrz.value), ["34567890"]);
    assert.deepEqual(JSON.parse(refs.hiddenDominio.value), ["AB123CD"]);
  } finally { globalThis.document = anterior; }
});
