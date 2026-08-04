import { obtenerCatalogoRecursosOperativos } from "../compartido/recursos/catalogo-recursos-operativos.js";

export function resolverRecursosInicioParaFinaliza(operativo = {}) {
  const payload = objeto(operativo?.inicio_payload);
  const datos = objeto(operativo?.datos);
  const metadata = objeto(operativo?.metadata);

  const personal = primerTexto(
    payload.personal,
    operativo.personal,
    operativo.personal_inicio,
    datos.personal_inicio,
    datos.personal,
    metadata.personal_inicio,
    metadata.personal
  );

  const movilesMotos = primerTexto(
    payload.moviles_motos,
    operativo.moviles_motos,
    datos.moviles_motos,
    metadata.moviles_motos,
    unirMovilidad(operativo.moviles, operativo.motos),
    unirMovilidad(datos.moviles, datos.motos),
    unirMovilidad(metadata.moviles, metadata.motos)
  );

  const elementosFuente = payload.elementos ?? operativo.elementos ?? datos.elementos_inicio ?? datos.elementos ?? metadata.elementos_inicio ?? metadata.elementos;
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

export function normalizarPersonalSalidaFinaliza(valor) {
  const equivalencias = {
    JEFE: "JEFE SubCrio. Choque J.M.",
    SUBJEFE: "SUBJEFE Inspector Fertonani S.."
  };

  return texto(valor)
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => equivalencias[linea.toUpperCase()] || linea)
    .join("\n");
}

function construirSeleccionInicial({ personal, movilesMotos, elementosFuente, elementosTexto }) {
  const catalogo = obtenerCatalogoRecursosOperativos();
  const personalCatalogo = catalogo.personal || [];
  const movilesCatalogo = new Set((catalogo.moviles || []).map(claveComparacion));
  const motosCatalogo = new Set((catalogo.motos || []).map(claveComparacion));

  const personalSeleccionado = lista(personal)
    .map(normalizarNombrePersonalInicio)
    .map((valor) => encontrarCatalogo(valor, personalCatalogo))
    .filter(Boolean);

  const movilidad = lista(movilesMotos);
  const moviles = movilidad.filter((valor) => movilesCatalogo.has(claveComparacion(valor)));
  const motos = movilidad.filter((valor) => motosCatalogo.has(claveComparacion(valor)));

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
