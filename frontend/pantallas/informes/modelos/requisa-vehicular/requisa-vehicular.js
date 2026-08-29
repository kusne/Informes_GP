export async function iniciarModeloInformeUI({ form, operativoSeleccionado } = {}) {
  if (!form) return;

  aplicarContextoOperativo(form, operativoSeleccionado || {}, { sobrescribirRecursos: true });

  form.addEventListener("informesgp:operativo-informe-actualizado", () => {
    // El builder ya actualizó los campos de contexto. Recalculamos únicamente
    // la presentación de los elementos asignados al nuevo operativo.
    sincronizarRecursosDesdeTexto(form, valorCampo(form, "elementos"), { sobrescribir: true });
  });
}

function aplicarContextoOperativo(form, op = {}, { sobrescribirRecursos = false } = {}) {
  establecerCampo(form, "fecha_hecho", fechaActual());
  establecerCampo(form, "hora_hecho", horaActual());
  establecerCampo(form, "lugar_hecho", primerTexto(op.lugar, op.qth, op.ubicacion));
  establecerCampo(form, "personal", resolverDatoOperativo(op, "personal"));
  establecerCampo(form, "moviles", resolverDatoOperativo(op, "moviles_motos"));

  const elementos = resolverDatoOperativo(op, "elementos");
  establecerCampo(form, "elementos", elementos);
  sincronizarRecursosDesdeTexto(form, elementos, { sobrescribir: sobrescribirRecursos });
}

function resolverDatoOperativo(op = {}, clave) {
  const datos = objeto(op.datos);
  const snapshot = objeto(datos.inicio_snapshot);

  return primerTexto(
    snapshot[clave],
    op[clave],
    datos[clave],
    clave === "moviles_motos" ? datos.movilidad : ""
  );
}

function sincronizarRecursosDesdeTexto(form, elementosTexto, { sobrescribir = false } = {}) {
  const grupos = parsearElementos(elementosTexto);

  asignarRecurso(form, "alometro", formatearEquipoSimple(grupos.alometros), "/", sobrescribir);
  asignarRecurso(form, "alcoholimetro", formatearEquipoSimple(grupos.alcoholimetros), "/", sobrescribir);
  asignarRecurso(form, "impresora", formatearNumerados(grupos.impresoras, "N° ", "/"), "/", sobrescribir);
  asignarRecurso(form, "pda", formatearNumerados(grupos.pda, "N ", ", "), "/", sobrescribir);
  asignarRecurso(form, "ht", formatearNumerados(grupos.ht, "N° ", "/"), "/", sobrescribir);
  asignarRecurso(form, "escopeta", formatearNumerados(grupos.escopetas, "N° ", "/"), "//", sobrescribir);
}

function parsearElementos(valor) {
  const salida = {
    escopetas: [],
    ht: [],
    pda: [],
    impresoras: [],
    alometros: [],
    alcoholimetros: []
  };

  if (!valor) return salida;

  if (typeof valor === "object" && !Array.isArray(valor)) {
    for (const clave of Object.keys(salida)) {
      salida[clave] = lista(valor[clave]);
    }
    return salida;
  }

  for (const linea of String(valor).split(/\r?\n/)) {
    const indice = linea.indexOf(":");
    if (indice < 0) continue;

    const etiqueta = normalizarClave(linea.slice(0, indice));
    const items = lista(linea.slice(indice + 1));

    if (etiqueta.includes("escopeta")) salida.escopetas = items;
    else if (etiqueta === "ht") salida.ht = items;
    else if (etiqueta === "pda") salida.pda = items;
    else if (etiqueta.includes("impresora")) salida.impresoras = items;
    else if (etiqueta.includes("alcoholimetro")) salida.alcoholimetros = items;
    else if (etiqueta.includes("alometro")) salida.alometros = items;
  }

  return salida;
}

function formatearEquipoSimple(items = []) {
  return items
    .map((item) => {
      const limpio = String(item || "").trim();
      const sufijo = limpio.match(/(?:^|[-\s])([A-Z]?\d{2,})$/i);
      return sufijo ? sufijo[1] : limpiarPrefijoNumero(limpio);
    })
    .filter(Boolean)
    .join(" / ");
}

function formatearNumerados(items = [], prefijo = "", separador = "/") {
  const numeros = items.map(limpiarPrefijoNumero).filter(Boolean);
  return numeros.length ? `${prefijo}${numeros.join(separador)}` : "";
}

function limpiarPrefijoNumero(valor) {
  return String(valor || "")
    .trim()
    .replace(/^N(?:RO|º|°)?\s*/i, "")
    .trim();
}

function asignarRecurso(form, nombre, valor, vacio, sobrescribir) {
  const campo = form?.querySelector(`[name="${nombre}"]`);
  if (!campo) return;

  const actual = String(campo.value || "").trim();
  const fueAuto = campo.dataset.valorAuto === "1";
  if (!sobrescribir && actual && !fueAuto) return;

  campo.value = String(valor || vacio || "").trim();
  campo.dataset.valorAuto = "1";
}

function establecerCampo(form, nombre, valor) {
  const campo = form?.querySelector(`[name="${nombre}"]`);
  if (!campo) return;
  campo.value = String(valor ?? "").trim();
}

function valorCampo(form, nombre) {
  return String(form?.querySelector(`[name="${nombre}"]`)?.value || "").trim();
}

function fechaActual() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${pad2(ahora.getMonth() + 1)}-${pad2(ahora.getDate())}`;
}

function horaActual() {
  const ahora = new Date();
  return `${pad2(ahora.getHours())}:${pad2(ahora.getMinutes())}`;
}

function pad2(valor) {
  return String(valor).padStart(2, "0");
}

function lista(valor) {
  if (Array.isArray(valor)) return valor.map(texto).filter((item) => item && item !== "/");
  return String(valor || "")
    .split(/\s*\/\s*|\s*,\s*/)
    .map(texto)
    .filter((item) => item && item !== "/");
}

function normalizarClave(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function objeto(valor) {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};
}

function primerTexto(...valores) {
  for (const valor of valores) {
    const limpio = texto(valor);
    if (limpio && limpio !== "[object Object]") return limpio;
  }
  return "";
}

function texto(valor) {
  return String(valor ?? "").trim();
}
