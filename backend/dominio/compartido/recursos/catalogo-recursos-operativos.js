const CATALOGO_RECURSOS_OPERATIVOS = Object.freeze({
  personal: Object.freeze([
    "JEFE",
    "SUBJEFE",
    "Subinspector Mariaux A.",
    "Subinspector Fernandez M.",
    "Oficial Merlo D.",
    "Oficial Lascurain I.",
    "Suboficial Aquino F.",
    "Suboficial Delgado Y.",
    "Suboficial Benavidez."
  ]),
  moviles: Object.freeze(["12428", "10139", "12502"]),
  motos: Object.freeze(["9092", "8989", "12089", "12090", "9029", "9030", "12091", "12087", "12088"]),
  elementos: Object.freeze([
    Object.freeze({ clave: "escopetas", etiqueta: "ESCOPETA", etiquetaSalida: "Escopetas", items: Object.freeze(["N°650367", "N°650368"]) }),
    Object.freeze({ clave: "ht", etiqueta: "HT", etiquetaSalida: "Ht", items: Object.freeze(["N°02", "N°V03", "N°06", "N°08"]) }),
    Object.freeze({ clave: "pda", etiqueta: "PDA", etiquetaSalida: "Pda", items: Object.freeze(["05", "19", "67", "68"]) }),
    Object.freeze({ clave: "impresoras", etiqueta: "IMPRESORA", etiquetaSalida: "Impresoras", items: Object.freeze(["N°05", "N°39", "N°64"]) }),
    Object.freeze({ clave: "alometros", etiqueta: "Alómetro", etiquetaSalida: "Alómetros", items: Object.freeze(["AREC-0127", "ARTL-0425", "ARSA-0360"]) }),
    Object.freeze({ clave: "alcoholimetros", etiqueta: "Alcoholímetro", etiquetaSalida: "Alcoholímetros", items: Object.freeze(["ARUJ-0239", "ARLM-0652"]) })
  ])
});

export function obtenerCatalogoRecursosOperativos() {
  return {
    personal: [...CATALOGO_RECURSOS_OPERATIVOS.personal],
    moviles: [...CATALOGO_RECURSOS_OPERATIVOS.moviles],
    motos: [...CATALOGO_RECURSOS_OPERATIVOS.motos],
    elementos: CATALOGO_RECURSOS_OPERATIVOS.elementos.map((grupo) => ({ ...grupo, items: [...grupo.items] }))
  };
}

export function construirResumenRecursosOperativos({ personal = [], moviles = [], motos = [], elementos = {} } = {}) {
  const personalTexto = normalizarLista(personal).join("\n");
  const movilidadCompleta = [...normalizarLista(moviles), ...normalizarLista(motos)];
  const lineasElementos = CATALOGO_RECURSOS_OPERATIVOS.elementos.map((grupo) => {
    const seleccionados = normalizarLista(elementos?.[grupo.clave]);
    return `${grupo.etiquetaSalida}: ${seleccionados.length ? seleccionados.join(" / ") : "/"}`;
  });

  return {
    personal: personalTexto,
    moviles_motos: movilidadCompleta.join(" / "),
    elementos: lineasElementos.join("\n")
  };
}

function normalizarLista(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}
