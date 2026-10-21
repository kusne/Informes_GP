import { obtenerCatalogoRecursosOperativos, construirResumenRecursosOperativos, presentarPersonalOperativo } from "../compartido/recursos/catalogo-recursos-operativos.js";

export function resolverRecursosInicioParaFinaliza(operativo = {}) {
  const vigentes = objeto(objeto(operativo?.datos).recursos_vigentes);
  if (Object.keys(vigentes).length) {
    const seleccionInicial = {
      personal: Array.isArray(vigentes.personal) ? vigentes.personal : [],
      moviles: Array.isArray(vigentes.moviles) ? vigentes.moviles : [],
      motos: Array.isArray(vigentes.motos) ? vigentes.motos : [],
      elementos: objeto(vigentes.elementos)
    };
    return {
      ...construirResumenRecursosOperativos(seleccionInicial),
      seleccionInicial,
      tienePersonal: seleccionInicial.personal.length > 0,
      tieneMovilidad: seleccionInicial.moviles.length + seleccionInicial.motos.length > 0,
      tieneElementos: Object.values(seleccionInicial.elementos).some(lista => Array.isArray(lista) && lista.length > 0)
    };
  }
  const payload = objeto(operativo?.inicio_payload);
  const datos = objeto(operativo?.datos);
  const metadata = objeto(operativo?.metadata);
  const inicio = objeto(datos.inicio_snapshot);

  const personal = primerTexto(
    payload.personal,
    inicio.personal,
    operativo.personal,
    operativo.personal_inicio,
    datos.personal_inicio,
    datos.personal,
    metadata.personal_inicio,
    metadata.personal
  );

  const movilesMotos = primerTexto(
    payload.moviles_motos,
    inicio.moviles_motos,
    operativo.moviles_motos,
    datos.moviles_motos,
    metadata.moviles_motos,
    unirMovilidad(operativo.moviles, operativo.motos),
    unirMovilidad(datos.moviles, datos.motos),
    unirMovilidad(metadata.moviles, metadata.motos)
  );

  const elementosFuente = payload.elementos ?? inicio.elementos ?? operativo.elementos ?? datos.elementos_inicio ?? datos.elementos ?? metadata.elementos_inicio ?? metadata.elementos;
  const elementos = normalizarElementosTexto(elementosFuente);

  const seleccionInicial = construirSeleccionInicial({
    personal,
    movilesMotos,
    elementosFuente,
    elementosTexto: elementos
  });

  return {
    personal,
    moviles_motos: movilesMotos,
    elementos,
    seleccionInicial,
    tienePersonal: Boolean(texto(personal)),
    tieneMovilidad: Boolean(texto(movilesMotos)),
    tieneElementos: Boolean(texto(elementos))
  };
}

// La jerarquía sólo afecta la presentación institucional; no modifica la
// dotación vigente ni los movimientos de RELEVO/ACOPLE almacenados.
export function normalizarPersonalSalidaFinaliza(valor) {
  const lineas = (Array.isArray(valor) ? valor : texto(valor).split(/\r?\n/))
    .map((linea) => texto(linea))
    .filter(Boolean);
  const unicos = new Set();
  return lineas
    .map((original, indice) => {
      const presentado = presentarPersonalOperativo(original).valor;
      return { original, presentado, indice, prioridad: prioridadJerarquicaPersonal(original, presentado) };
    })
    .filter(({ presentado }) => {
      const clave = normalizarGradoPersonal(presentado);
      if (!clave || unicos.has(clave)) return false;
      unicos.add(clave);
      return true;
    })
    .sort((a, b) => a.prioridad - b.prioridad || a.indice - b.indice)
    .map(({ presentado }) => presentado)
    .join("\n");
}

// El cargo de jefe/subjefe tiene prioridad funcional; luego se ordena por
// grado. Los grados no reconocidos conservan su orden relativo de ingreso.
function prioridadJerarquicaPersonal(original, presentado) {
  const fuente = normalizarGradoPersonal(original);
  const nombre = normalizarGradoPersonal(presentado);
  if (/^JEFE\b/.test(fuente) || /^SUBCOMISARIO CHOQUE\b/.test(nombre)) return 0;
  if (/^SUBJEFE\b/.test(fuente) || /^INSPECTOR FERTONANI\b/.test(nombre)) return 1;
  const grados = [
    /^COMISARIO GENERAL\b/, /^COMISARIO MAYOR\b/,
    /^COMISARIO SUPERVISOR\b/, /^COMISARIO\b/, /^SUBCOMISARIO\b/,
    /^INSPECTOR\b/, /^SUBINSPECTOR\b/, /^OFICIAL PRINCIPAL\b/,
    /^OFICIAL AUXILIAR\b/, /^OFICIAL\b/, /^SUBOFICIAL MAYOR\b/,
    /^SUBOFICIAL PRINCIPAL\b/, /^SUBOFICIAL DE POLICIA\b/,
    /^SUBOFICIAL\b/, /^SARGENTO AYUDANTE\b/, /^SARGENTO PRIMERO\b/,
    /^SARGENTO\b/, /^CABO PRIMERO\b/, /^CABO\b/, /^AGENTE\b/
  ];
  const posicion = grados.findIndex((patron) => patron.test(nombre));
  return posicion < 0 ? 1000 : posicion + 2;
}
function normalizarGradoPersonal(valor) {
  return texto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

function construirSeleccionInicial({ personal, movilesMotos, elementosFuente, elementosTexto }) {
  const catalogo = obtenerCatalogoRecursosOperativos();
  const personalCatalogo = catalogo.personal || [];
  const movilesCatalogo = new Set((catalogo.moviles || []).map(claveComparacion));
  const motosCatalogo = new Set((catalogo.motos || []).map(claveComparacion));

  // El catálogo estático contiene únicamente JEFE/SUBJEFE y no contiene móviles.
  // Nunca descartar el personal ni los móviles que constan en el INICIO real.
  const personalSeleccionado = lista(personal)
    .map(normalizarNombrePersonalInicio)
    .map((valor) => encontrarCatalogo(valor, personalCatalogo) || valor)
    .filter(Boolean);

  const movilidad = lista(movilesMotos);
  const motos = movilidad.filter((valor) => motosCatalogo.has(claveComparacion(valor)));
  const moviles = movilidad.filter((valor) => !motosCatalogo.has(claveComparacion(valor)) &&
    (movilesCatalogo.has(claveComparacion(valor)) || /^\d{3,6}$/.test(valor)));

  return {
    personal: unicos(personalSeleccionado),
    moviles: unicos(moviles),
    motos: unicos(motos),
    elementos: resolverElementosSeleccionados(elementosFuente, elementosTexto, catalogo.elementos || [])
  };
}

function resolverElementosSeleccionados(fuente, textoNormalizado, gruposCatalogo) {
  const resultado = Object.fromEntries((gruposCatalogo || []).map((grupo) => [grupo.clave, []]));

  if (fuente && typeof fuente === "object" && !Array.isArray(fuente)) {
    for (const grupo of gruposCatalogo) {
      const candidatos = fuente[grupo.clave]
        ?? fuente[aliasElemento(grupo.clave)]
        ?? fuente[grupo.etiqueta]
        ?? fuente[grupo.etiquetaSalida];
      resultado[grupo.clave] = filtrarContraCatalogo(lista(candidatos), grupo.items || []);
    }
    return resultado;
  }

  const lineas = String(textoNormalizado || fuente || "").split(/\r?\n/);
  for (const linea of lineas) {
    const partes = linea.split(":");
    if (partes.length < 2) continue;
    const etiqueta = claveComparacion(partes.shift());
    const valores = lista(partes.join(":"));
    const grupo = gruposCatalogo.find((g) => clavesGrupoElemento(g).includes(etiqueta));
    if (!grupo) continue;
    resultado[grupo.clave] = filtrarContraCatalogo(valores, grupo.items || []);
  }

  return resultado;
}

function clavesGrupoElemento(grupo) {
  return [grupo.clave, grupo.etiqueta, grupo.etiquetaSalida, aliasElemento(grupo.clave)]
    .map(claveComparacion)
    .filter(Boolean);
}

function aliasElemento(clave) {
  const aliases = {
    escopetas: "ESCOPETA",
    ht: "HT",
    pda: "PDA",
    impresoras: "IMPRESORA",
    alometros: "Alometro",
    alcoholimetros: "Alcoholimetro"
  };
  return aliases[clave] || clave;
}

function filtrarContraCatalogo(valores, catalogo) {
  const mapa = new Map((catalogo || []).map((valor) => [claveComparacion(valor), valor]));
  return unicos((valores || []).map((valor) => mapa.get(claveComparacion(valor))).filter(Boolean));
}

function encontrarCatalogo(valor, catalogo) {
  const clave = claveComparacion(valor);
  return (catalogo || []).find((item) => claveComparacion(item) === clave) || "";
}

function normalizarNombrePersonalInicio(valor) {
  const t = texto(valor);
  const upper = t.toUpperCase();
  if (upper.startsWith("JEFE ") || upper === "JEFE") return "JEFE";
  if (upper.startsWith("SUBJEFE ") || upper === "SUBJEFE") return "SUBJEFE";
  return t;
}

function normalizarElementosTexto(valor) {
  if (typeof valor === "string") return valor.trim();
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return "";

  const grupos = [
    ["Escopetas", valor.escopetas ?? valor.ESCOPETA],
    ["Ht", valor.ht ?? valor.HT],
    ["Pda", valor.pda ?? valor.PDA],
    ["Impresoras", valor.impresoras ?? valor.IMPRESORA],
    ["Alómetros", valor.alometros ?? valor.Alometro],
    ["Alcoholímetros", valor.alcoholimetros ?? valor.Alcoholimetro]
  ];

  return grupos.map(([etiqueta, items]) => `${etiqueta}: ${listaTexto(items) || "/"}`).join("\n");
}

function unirMovilidad(moviles, motos) {
  return [...lista(moviles), ...lista(motos)].join(" / ");
}

function lista(valor) {
  if (Array.isArray(valor)) return valor.map(texto).filter(Boolean);
  if (typeof valor === "string") {
    return valor
      .split(/\r?\n|\s*\/\s*|\s*,\s*/)
      .map(texto)
      .filter((item) => item && item !== "/");
  }
  return [];
}

function listaTexto(valor) {
  return lista(valor).join(" / ");
}

function objeto(valor) {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) return valor;
  if (typeof valor === "string" && valor.trim()) {
    try {
      const parsed = JSON.parse(valor);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {}
  }
  return {};
}

function primerTexto(...valores) {
  for (const valor of valores) {
    if (Array.isArray(valor)) {
      const t = valor.map(texto).filter(Boolean).join("\n");
      if (t) return t;
      continue;
    }
    const t = texto(valor);
    if (t && t !== "[object Object]") return t;
  }
  return "";
}

function unicos(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function claveComparacion(valor) {
  return texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function texto(valor) {
  return String(valor ?? "").trim();
}
