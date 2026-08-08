export function resolverTipoNombreOperativo(actual = {}, operativo = actual?.operativo || {}) {
  return primerTexto(
    operativo?.tipo_nombre,
    operativo?.tipo_original,
    operativo?.datos?.tipo_nombre,
    operativo?.datos?.tipo_original,
    actual?.tipo_nombre,
    actual?.datos?.tipo_nombre,
    actual?.tipo_operativo,
    operativo?.tipo_operativo,
    "OPERATIVO"
  );
}

export function resolverOrdenesOrigenOperativo(actual = {}, operativo = actual?.operativo || {}) {
  const candidatos = [
    operativo?.ordenes_origen,
    operativo?.datos?.ordenes_origen,
    actual?.ordenes_origen,
    actual?.datos?.ordenes_origen
  ];

  for (const candidato of candidatos) {
    const lista = normalizarArray(candidato);
    if (lista.length) return lista;
  }
  return [];
}

export function anexarOrdenesAlTitulo(titulo, ordenes = []) {
  const base = texto(titulo) || "Operativo";
  const lista = normalizarArray(ordenes);
  if (!lista.length) return base;

  const numerosYaPresentes = new Set(extraerNumerosOrden(base));
  const faltantes = lista.filter((orden) => {
    const numeros = extraerNumerosOrden(orden);
    return !numeros.length || numeros.some((numero) => !numerosYaPresentes.has(numero));
  });

  return faltantes.length ? `${base} ${faltantes.join(" - ")}` : base;
}

export function normalizarOrdenesOrigen(valor) {
  return normalizarArray(valor);
}

function extraerNumerosOrden(valor) {
  return (texto(valor).match(/\b\d{1,6}\s*\/\s*\d{2,4}\b/g) || [])
    .map((item) => item.replace(/\s+/g, ""));
}

function normalizarArray(valor) {
  if (Array.isArray(valor)) return [...new Set(valor.map(texto).filter(Boolean))];
  const raw = texto(valor);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return [...new Set(parsed.map(texto).filter(Boolean))];
  } catch {}
  return [...new Set(raw.split(/[\n;,]+/).map(texto).filter(Boolean))];
}

function primerTexto(...valores) {
  for (const valor of valores) {
    const limpio = texto(valor);
    if (limpio) return limpio;
  }
  return "";
}

function texto(valor) {
  return String(valor ?? "").trim();
}
