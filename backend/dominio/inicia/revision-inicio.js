// Rectificación y ampliación de un INICIO ya enviado. Nunca crea otro operativo.
import { construirTextoInicioBase } from "./inicio-salida-texto-base.js";
import { resolverRecursosInicioParaFinaliza } from "../finaliza/recursos-finaliza.js";

const TIPO_CORRECCION = "CORRECCION";
const TIPO_AMPLIACION = "AMPLIACION";

function texto(value) { return String(value ?? "").trim(); }
function objeto(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function unicos(values) { return [...new Set(values.map(texto).filter(Boolean))]; }
function partes(value) {
  return texto(value).split(/\s*(?:\r?\n|\/|,|;)\s*/).map(texto).filter(Boolean);
}
function lineas(value) { return texto(value).split(/\r?\n/).map(texto).filter(Boolean); }
function unirTexto(a, b, separador) { return unicos([...a, ...b]).join(separador); }
function mismo(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

export function normalizarDependenciasInicio(filas = []) {
  if (!Array.isArray(filas)) return [];
  if (filas.length > 20) throw Error("No pueden incorporarse más de 20 dependencias por envío.");
  const resultado = new Map();
  for (const fila of filas) {
    const nombre = texto(fila?.nombre).replace(/\s+/g, " ").toLocaleUpperCase("es-AR");
    const personal = lineas(fila?.personal);
    const moviles = partes(fila?.moviles);
    if (!nombre) throw Error("Completá el nombre de cada dependencia u organismo.");
    if (!personal.length && !moviles.length)
      throw Error("Completá personal o móviles para " + nombre + ".");
    const previo = resultado.get(nombre) || { nombre, personal: "", moviles: "" };
    resultado.set(nombre, {
      nombre,
      personal: unirTexto(lineas(previo.personal), personal, "\n"),
      moviles: unirTexto(partes(previo.moviles), moviles, " / ")
    });
  }
  return [...resultado.values()];
}

function combinarDependencias(previas = [], nuevas = []) {
  const mapa = new Map();
  for (const fila of [...previas, ...nuevas]) {
    const nombre = fila.nombre;
    const anterior = mapa.get(nombre) || {nombre, personal:"", moviles:""};
    mapa.set(nombre, {
      nombre,
      personal: unirTexto(lineas(anterior.personal), lineas(fila.personal), "\n"),
      moviles: unirTexto(partes(anterior.moviles), partes(fila.moviles), " / ")
    });
  }
  return [...mapa.values()];
}

function snapshotInicio(op) {
  const datos = objeto(op?.datos);
  const inicio = objeto(datos.inicio_snapshot);
  return {
    ...inicio,
    personal: texto(inicio.personal ?? op?.personal),
    moviles_motos: texto(inicio.moviles_motos ?? op?.moviles_motos),
    elementos: texto(inicio.elementos ?? op?.elementos),
    observaciones: texto(inicio.observaciones ?? op?.observaciones),
    tipo_nombre: texto(inicio.tipo_nombre || op?.tipo_nombre),
    fecha_operativo: texto(inicio.fecha_operativo || op?.fecha_operativo || datos.fecha_operativo)
  };
}

export function obtenerDatosInicioParaRevision(op = {}) {
  const datos = objeto(op.datos);
  return {
    formulario: snapshotInicio(op),
    dependencias: Array.isArray(datos.dependencias_agregadas)
      ? datos.dependencias_agregadas.map(d => ({...d})) : [],
    tieneMovimientos: Array.isArray(datos.movimientos_recursos) && datos.movimientos_recursos.length > 0
  };
}

function anexarBloquesDependencias(dependencias = []) {
  return dependencias.map(dep => [
    "*DEPENDENCIA / ORGANISMO: " + dep.nombre + "*",
    "*PERSONAL " + dep.nombre + ":*",
    dep.personal || "/",
    "*MÓVIL/ES " + dep.nombre + ":* " + (dep.moviles || "/")
  ].join("\n")).join("\n\n");
}

function construirTextoCorreccion(op, snapshot, dependencias) {
  const base = construirTextoInicioBase({
    operativo: op,
    guardia_fecha: op.guardia_fecha,
    fecha: op.fecha_evento || new Date().toISOString(),
    fecha_operativo: snapshot.fecha_operativo || op.guardia_fecha,
    hora_inicio: op.hora_inicio,
    hora_fin: op.hora_fin,
    lugar: op.lugar,
    tipo_operativo: op.tipo_operativo,
    formulario: snapshot
  });
  const rectificado = base.replace("*Inicia ", "*INICIO RECTIFICADO ");
  const bloques = anexarBloquesDependencias(dependencias);
  return bloques ? rectificado + "\n\n" + bloques : rectificado;
}

// Una actualización de INICIO NO es un parte distinto: usa el texto íntegro
// que ya fue enviado. Nunca volver a inventar encabezados, fecha ni horario.
function resolverTextoBaseGuardado(op, datos, anteriores) {
  if (texto(datos.inicio_texto_base)) return texto(datos.inicio_texto_base);
  const salida = texto(op?.texto_salida) || texto(objeto(datos.inicio_snapshot).texto_salida);
  if (!salida) throw Error("No se encontró el texto original del INICIO. No se puede actualizar sin conservar su formato.");
  // Compatibilidad con INICIOS rectificados en versiones anteriores: únicamente
  // se retiran bloques añadidos por la plantilla antigua al FINAL del documento.
  const bloqueAnterior = anexarBloquesDependencias(anteriores);
  const sufijo = bloqueAnterior ? "\n\n" + bloqueAnterior : "";
  if (sufijo && salida.endsWith(sufijo)) return salida.slice(0, -sufijo.length);
  return salida;
}

function etiquetaDependencia(nombre) {
  // Conservar el nombre institucional en Supabase, pero usar el rótulo corto
  // de los modelos que emplea la Sub Base UOR3.
  return /^SUB\s*BASE(?:\s+U\.?\s*O\.?\s*R\.?\s*\d+)?$/i.test(nombre)
    ? "Sub Base" : texto(nombre);
}

function bloquesActualizacion(dependencias) {
  return dependencias.map(dep => {
    const titulo = etiquetaDependencia(dep.nombre);
    return [
      "*Personal " + titulo + ":*",
      dep.personal || "/",
      "*Movil " + titulo + ":* " + (dep.moviles || "/")
    ].join("\n");
  }).join("\n\n");
}

// El INICIO de algunas guardias ya incluye un bloque de dependencia escrito a
// mano (sin asteriscos), por ejemplo "Personal Sub Base / Movil: 10138".
// Normalizar sólo ese bloque cuando es inequívocamente el mismo que se agrega.
// No modificar jamás observaciones, personal propio ni otras dependencias.
function claveBloque(valor) {
  return texto(valor).replace(/\*/g, "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function tokensIdentidad(valor) {
  const ignorar = new Set([
    "of", "oficial", "subof", "suboficial", "policia", "policial", "agente",
    "subinspector", "inspector", "comisario", "subcomisario", "de", "del",
    "la", "el", "dr", "crio", "sargento", "cabo", "primero"
  ]);
  return claveBloque(valor).split(" ").filter(p => p.length >= 3 && !ignorar.has(p));
}

function retirarBloquesDependenciaRepetidos(original, dependencias) {
  if (!dependencias.length) return String(original ?? "");
  const salida = String(original ?? "");
  const salto = salida.includes("\r\n") ? "\r\n" : "\n";
  const lineasOriginales = salida.split(/\r?\n/);
  const inicioMoviles = lineasOriginales.findIndex(l => /^\s*\*M[oó]viles:\*/i.test(l));
  const inicioElementos = lineasOriginales.findIndex((l, i) => i > inicioMoviles && /^\s*\*Elementos:\*/i.test(l));
  if (inicioMoviles < 0 || inicioElementos < 0) return salida;
  const lineasSalida = lineasOriginales.slice();

  for (const dependencia of dependencias) {
    const etiquetas = new Set([
      claveBloque(dependencia.nombre), claveBloque(etiquetaDependencia(dependencia.nombre))
    ]);
    for (let i = inicioMoviles + 1; i < lineasSalida.length; i++) {
      if (/^\s*\*Elementos:\*/i.test(lineasSalida[i])) break;
      const cabecera = /^\s*\*?\s*Personal\s+(.+?):\s*\*?\s*$/i.exec(lineasSalida[i]);
      if (!cabecera || !etiquetas.has(claveBloque(cabecera[1]))) continue;

      const personal = [];
      let fin = -1, movilesImpresos = "";
      for (let j = i + 1; j < lineasSalida.length && j < i + 24; j++) {
        const actual = lineasSalida[j].trim();
        if (/^\*?\s*(?:Personal\s+.+?:|Elementos:)/i.test(actual)) break;
        const movil = /^\*?\s*M[oó]vil(?:es|\/es)?\s*(.*?)\s*:\s*\*?\s*(.*?)\s*\*?\s*$/i.exec(actual);
        if (movil) {
          if (movil[1] && !etiquetas.has(claveBloque(movil[1]))) break;
          fin = j;
          movilesImpresos = movil[2];
          break;
        }
        if (actual) personal.push(actual);
      }
      if (fin < 0) throw Error("No se pudo reconocer el bloque previo de " + dependencia.nombre + ". No se modificó el INICIO.");

      const anterioresMoviles = partes(movilesImpresos);
      const nuevosMoviles = partes(dependencia.moviles);
      const mismosMoviles = anterioresMoviles.every(m => nuevosMoviles.some(n => claveBloque(m) === claveBloque(n)));
      const tokensNuevos = lineas(dependencia.personal).map(tokensIdentidad);
      const mismoPersonal = personal.every(p => {
        const tokens = tokensIdentidad(p);
        return tokens.length && tokensNuevos.some(otros => tokens.some(t => otros.includes(t)));
      });
      if (!mismosMoviles || !mismoPersonal) {
        throw Error("El bloque preexistente de " + dependencia.nombre +
          " contiene personal o móviles distintos. Revisalo antes de actualizar el INICIO; no se borró información.");
      }
      // Retirar sólo esta copia redundante (con o sin negritas). La versión
      // canónica se insertará exactamente una vez tras los móviles propios.
      lineasSalida.splice(i, fin - i + 1);
      i--;
    }
  }
  // Si el sector entre Móviles y Elementos sólo quedó con renglones vacíos,
  // restaurar exactamente una línea separadora, como en el INICIO original.
  const inicioFinal = lineasSalida.findIndex(l => /^\s*\*M[oó]viles:\*/i.test(l));
  const elementosFinal = lineasSalida.findIndex((l, j) => j > inicioFinal && /^\s*\*Elementos:\*/i.test(l));
  if (inicioFinal >= 0 && elementosFinal > inicioFinal &&
      lineasSalida.slice(inicioFinal + 1, elementosFinal).every(l => !l.trim())) {
    lineasSalida.splice(inicioFinal + 1, elementosFinal - inicioFinal - 1, "");
  }
  return lineasSalida.join(salto);
}

function insertarDependenciasEnInicio(original, dependencias) {
  const base = String(original ?? "");
  if (!dependencias.length) return base;
  // La plantilla vigente sitúa Móviles en una sola línea antes de Elementos.
  // Si el documento persistido difiere, no reconstruirlo ni generar datos
  // supuestos: se exige un anclaje inequívoco para conservar el INICIO exacto.
  const lineaMoviles = /^[ \t]*\*M[oó]viles:\*[^\r\n]*(?:\r?\n|$)/im.exec(base);
  const lineaElementos = /^[ \t]*\*Elementos:\*/im.exec(base);
  if (!lineaMoviles || !lineaElementos ||
      lineaMoviles.index + lineaMoviles[0].length > lineaElementos.index)
    throw Error("El INICIO guardado no tiene un bloque Móviles seguido de Elementos. No se modificó su formato.");
  const posicion = lineaMoviles.index + lineaMoviles[0].length;
  const salto = lineaMoviles[0].endsWith("\r\n") ? "\r\n" : "\n";
  const antes = base.slice(0, posicion);
  // La copia manual retirada puede dejar líneas vacías; conservar una única
  // separación entre bloques, sin alterar el resto del informe original.
  const despues = base.slice(posicion).replace(/^(?:[ \t]*\r?\n)*/, "");
  const bloques = bloquesActualizacion(dependencias).replace(/\n/g, salto);
  return antes + salto + bloques + salto + salto + despues;
}

function vigentesDeSnapshot(op, snapshot, datos) {
  const copia = { ...datos, inicio_snapshot:snapshot };
  delete copia.recursos_vigentes;
  const recursos = resolverRecursosInicioParaFinaliza({
    ...op,
    inicio_payload:null,
    datos:copia,
    personal:snapshot.personal,
    moviles_motos:snapshot.moviles_motos,
    elementos:snapshot.elementos
  });
  return recursos.seleccionInicial;
}

function incluirDependenciasRecursos(vigentes, dependencias) {
  const personal = unicos([...(vigentes.personal || []), ...dependencias.flatMap(dep=>lineas(dep.personal))]);
  const moviles = unicos([...(vigentes.moviles || []), ...dependencias.flatMap(dep=>partes(dep.moviles))]);
  return {
    personal,
    moviles,
    motos: [...(vigentes.motos || [])],
    elementos: { ...(vigentes.elementos || {}) }
  };
}

/**
 * Se prepara una actualización limitada a la fila ya existente.
 * - CORRECCION modifica el snapshot de INICIO, no el estado del operativo.
 * - AMPLIACION agrega bloques propios por dependencia y suma los nuevos recursos vigentes.
 * - El historial y las transiciones posteriores permanecen intactos.
 */
export function prepararRevisionInicioOperativo({
  operativo, accion, formulario = {}, dependencias = [], fecha = new Date().toISOString()
} = {}) {
  if (!operativo?.operativo_key || !operativo?.guardia_fecha ||
      texto(operativo.estado).toUpperCase() !== "EN_CURSO")
    throw Error("Sólo se puede modificar un INICIO de un operativo EN CURSO real.");
  if (![TIPO_CORRECCION, TIPO_AMPLIACION].includes(accion))
    throw Error("Seleccioná corregir INICIO o agregar dependencias.");

  const datosPrevios = objeto(operativo.datos);
  const anterior = snapshotInicio(operativo);
  const antiguas = normalizarDependenciasInicio(datosPrevios.dependencias_agregadas || []);
  let siguiente = anterior;
  let nuevas = [];

  if (accion === TIPO_CORRECCION) {
    siguiente = {
      ...anterior,
      personal: texto(formulario.personal),
      moviles_motos: texto(formulario.moviles_motos),
      elementos: texto(formulario.elementos),
      observaciones: texto(formulario.observaciones)
    };
    if (!siguiente.personal || !siguiente.moviles_motos)
      throw Error("El INICIO corregido debe conservar Personal y Móviles.");
    if (["personal","moviles_motos","elementos","observaciones"]
      .every(clave => siguiente[clave] === anterior[clave]))
      throw Error("No hay modificaciones respecto al INICIO enviado.");
  } else {
    nuevas = normalizarDependenciasInicio(dependencias);
    if (!nuevas.length)
      throw Error("Agregá al menos una dependencia con personal o móviles.");
  }

  const actualizadas = combinarDependencias(antiguas, nuevas);


  const baseOriginal = accion === TIPO_CORRECCION
    ? construirTextoCorreccion(operativo, siguiente, [])
    : resolverTextoBaseGuardado(operativo, datosPrevios, antiguas);
  const baseActualizada = accion === TIPO_CORRECCION
    ? baseOriginal : retirarBloquesDependenciaRepetidos(baseOriginal, actualizadas);
  const textoSalida = accion === TIPO_CORRECCION
    ? construirTextoCorreccion(operativo, siguiente, actualizadas)
    : insertarDependenciasEnInicio(baseActualizada, actualizadas);
  // Una reimpresión correctiva puede quitar un bloque redundante preexistente
  // aun cuando la dependencia ya figure en los datos del operativo.
  if (accion === TIPO_AMPLIACION && mismo(actualizadas, antiguas) &&
      textoSalida === texto(operativo.texto_salida))
    throw Error("Las dependencias indicadas ya figuran en el inicio. No hay datos nuevos.");

  const movimientosPosteriores = Array.isArray(datosPrevios.movimientos_recursos)
    ? datosPrevios.movimientos_recursos : [];
  const datos = {
    ...datosPrevios,
    inicio_snapshot: siguiente,
    inicio_texto_base: baseActualizada,
    inicio_texto_actualizado: textoSalida,
    dependencias_agregadas: actualizadas,
    revisiones_inicio: [
      ...(Array.isArray(datosPrevios.revisiones_inicio) ? datosPrevios.revisiones_inicio : []),
      {
        tipo:accion, fecha_evento:fecha, texto: textoSalida,
        anterior:accion===TIPO_CORRECCION ? anterior : antiguas,
        posterior:accion===TIPO_CORRECCION ? siguiente : actualizadas
      }
    ]
  };

  const anteriorVigente = objeto(datosPrevios.recursos_vigentes);
  if (accion === TIPO_AMPLIACION) {
    const vigente = Object.keys(anteriorVigente).length
      ? anteriorVigente : vigentesDeSnapshot(operativo, anterior, datosPrevios);
    // Sólo sumar los recursos realmente nuevos; nunca cancelar RELEVO/RETIRO.
    datos.recursos_vigentes = incluirDependenciasRecursos(vigente, nuevas);
  } else if (!movimientosPosteriores.length) {
    datos.recursos_vigentes = incluirDependenciasRecursos(
      vigentesDeSnapshot(operativo, siguiente, datosPrevios), actualizadas
    );
  }

  const parche = {datos};
  if (accion === TIPO_CORRECCION) {
    parche.personal = siguiente.personal;
    parche.moviles_motos = siguiente.moviles_motos;
    parche.elementos = siguiente.elementos;
    parche.observaciones = siguiente.observaciones;
  }
  // La última versión íntegra del INICIO debe seguir accesible desde la misma
  // fila, incluso después de actualizaciones sucesivas o reversiones.
  parche.texto_salida = textoSalida;

  return { texto: textoSalida, parche, accion, guardia_fecha: operativo.guardia_fecha,
    operativo_key: operativo.operativo_key };
}
