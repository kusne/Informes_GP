export function iniciarResultadosDinamicosFinaliza({ form, onChange } = {}) {
  if (!form || form.dataset.resultadosDinamicosIniciado === "1") return;
  form.dataset.resultadosDinamicosIniciado = "1";

  const refs = {
    testAlcoholimetro: form.querySelector("#finalizaTestAlcoholimetro"),
    positivos: form.querySelector("#finalizaPositivosAlcoholimetro"),
    positivaSancionable: form.querySelector("#finalizaPositivaSancionable"),
    positivaNoSancionable: form.querySelector("#finalizaPositivaNoSancionable"),
    wrapGradSan: form.querySelector("#finalizaWrapGraduacionesSancionable"),
    wrapGradNo: form.querySelector("#finalizaWrapGraduacionesNoSancionable"),
    gradSan: form.querySelector("#finalizaGraduacionesSancionable"),
    gradNo: form.querySelector("#finalizaGraduacionesNoSancionable"),
    qrz: form.querySelector("#finalizaQrz"),
    wrapQrz: form.querySelector("#finalizaWrapQrzCasilleros"),
    qrzCasilleros: form.querySelector("#finalizaQrzCasilleros"),
    dominio: form.querySelector("#finalizaDominio"),
    wrapDominio: form.querySelector("#finalizaWrapDominioCasilleros"),
    dominioCasilleros: form.querySelector("#finalizaDominioCasilleros"),
    hiddenGradSan: form.querySelector('[name="graduaciones_sancionable"]'),
    hiddenGradNo: form.querySelector('[name="graduaciones_no_sancionable"]'),
    hiddenQrz: form.querySelector('[name="qrz_documentos"]'),
    hiddenDominio: form.querySelector('[name="dominio_items"]')
  };

  const notificar = () => {
    serializarOcultos(refs);
    onChange?.();
  };
  refs.notificar = notificar;

  refs.testAlcoholimetro?.addEventListener("input", () => { sincronizarAlcoholimetro(refs); notificar(); });
  refs.positivaSancionable?.addEventListener("input", () => { sincronizarAlcoholimetro(refs); notificar(); });
  refs.positivaNoSancionable?.addEventListener("input", () => { sincronizarAlcoholimetro(refs); notificar(); });
  refs.qrz?.addEventListener("input", () => { sincronizarQrzDominio(refs); notificar(); });
  refs.dominio?.addEventListener("input", () => { sincronizarQrzDominio(refs); notificar(); });

  sincronizarAlcoholimetro(refs);
  sincronizarQrzDominio(refs);
  serializarOcultos(refs);
}

export function sincronizarAlcoholimetro(refs) {
  const total = entero(refs.testAlcoholimetro?.value);
  const san = entero(refs.positivaSancionable?.value);
  const noSan = entero(refs.positivaNoSancionable?.value);
  const mostrar = total > 0;

  refs.positivos?.classList.toggle("hidden", !mostrar);
  if (!mostrar) {
    if (refs.positivaSancionable) refs.positivaSancionable.value = "";
    if (refs.positivaNoSancionable) refs.positivaNoSancionable.value = "";
    refs.wrapGradSan?.classList.add("hidden");
    refs.wrapGradNo?.classList.add("hidden");
    if (refs.gradSan) refs.gradSan.innerHTML = "";
    if (refs.gradNo) refs.gradNo.innerHTML = "";
    serializarOcultos(refs);
    return;
  }

  refs.wrapGradSan?.classList.toggle("hidden", san <= 0);
  refs.wrapGradNo?.classList.toggle("hidden", noSan <= 0);
  renderGraduaciones(refs.gradSan, san, refs.notificar || (() => serializarOcultos(refs)));
  renderGraduaciones(refs.gradNo, noSan, refs.notificar || (() => serializarOcultos(refs)));
  serializarOcultos(refs);
}

export function sincronizarQrzDominio(refs) {
  const cantidadQrz = entero(refs.qrz?.value);
  refs.wrapQrz?.classList.toggle("hidden", cantidadQrz <= 0);
  renderLista(refs.qrzCasilleros, cantidadQrz, "qrz", refs.notificar || (() => serializarOcultos(refs)));

  const cantidadDominio = entero(refs.dominio?.value);
  refs.wrapDominio?.classList.toggle("hidden", cantidadDominio <= 0);
  renderLista(refs.dominioCasilleros, cantidadDominio, "dominio", refs.notificar || (() => serializarOcultos(refs)));
  serializarOcultos(refs);
}

function renderGraduaciones(host, cantidad, onInput) {
  if (!host) return;
  const actuales = Array.from(host.querySelectorAll('input[type="text"]')).map((i) => i.value);
  host.innerHTML = "";
  for (let i = 0; i < cantidad; i += 1) {
    const slot = document.createElement("div");
    slot.className = "finaliza-graduacion-slot";
    const abre = document.createElement("span"); abre.textContent = "(";
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.maxLength = 4;
    input.placeholder = "0,86";
    input.value = actuales[i] || "";
    input.addEventListener("input", onInput);
    const cierra = document.createElement("span"); cierra.textContent = ")";
    slot.append(abre, input, cierra);
    host.appendChild(slot);
  }
}

function renderLista(host, cantidad, tipo, onInput) {
  if (!host) return;
  const actuales = Array.from(host.querySelectorAll('input[type="text"]')).map((i) => i.value);
  host.innerHTML = "";
  for (let i = 0; i < cantidad; i += 1) {
    const input = document.createElement("input");
    input.type = "text";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.className = `finaliza-casillero-${tipo}`;
    if (tipo === "qrz") {
      input.inputMode = "numeric";
      input.maxLength = 9;
      input.placeholder = "36459780";
      input.value = sanitizarQrz(actuales[i]);
      input.addEventListener("input", () => { input.value = sanitizarQrz(input.value); onInput?.(); });
    } else {
      input.inputMode = "text";
      input.maxLength = 16;
      input.placeholder = "AA123QK Sedan";
      input.value = sanitizarDominio(actuales[i]);
      input.addEventListener("input", () => { input.value = sanitizarDominio(input.value); onInput?.(); });
    }
    host.appendChild(input);
  }
}

function serializarOcultos(refs) {
  asignarJson(refs.hiddenGradSan, valores(refs.gradSan));
  asignarJson(refs.hiddenGradNo, valores(refs.gradNo));
  asignarJson(refs.hiddenQrz, valores(refs.qrzCasilleros).map(sanitizarQrz));
  asignarJson(refs.hiddenDominio, valores(refs.dominioCasilleros).map(sanitizarDominio));
}

function valores(host) {
  return Array.from(host?.querySelectorAll('input[type="text"]') || []).map((i) => String(i.value || "").trim());
}
function asignarJson(input, value) { if (input) input.value = JSON.stringify(value); }
function entero(v) { const n = parseInt(String(v || "0"), 10); return Number.isFinite(n) && n > 0 ? n : 0; }
function sanitizarQrz(v) { return String(v || "").replace(/\D+/g, "").slice(0, 9); }
function sanitizarDominio(v) { return String(v || "").toUpperCase().replace(/[^A-Z0-9 ]+/g, "").slice(0, 16); }
