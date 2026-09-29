const CATALOGO_RECURSOS_OPERATIVOS = Object.freeze({
  personal: Object.freeze(["JEFE", "SUBJEFE"]),
  moviles: Object.freeze([]),
  motos: Object.freeze([]),
  elementos: Object.freeze([
    Object.freeze({ clave: "escopetas", etiqueta: "ESCOPETA", etiquetaSalida: "Escopetas", items: Object.freeze(["N°650367", "N°650368"]) }),
    Object.freeze({ clave: "ht", etiqueta: "HT", etiquetaSalida: "Ht", items: Object.freeze(["N°02", "N°V03", "N°06", "N°08"]) }),
    Object.freeze({ clave: "pda", etiqueta: "PDA", etiquetaSalida: "Pda", items: Object.freeze(["05", "19", "67", "68"]) }),
    Object.freeze({ clave: "impresoras", etiqueta: "IMPRESORA", etiquetaSalida: "Impresoras", items: Object.freeze(["N°05", "N°39", "N°64"]) }),
    Object.freeze({ clave: "alometros", etiqueta: "Alómetro", etiquetaSalida: "Alómetros", items: Object.freeze(["AREC-0127", "ARTL-0425", "ARSA-0360"]) }),
    Object.freeze({ clave: "alcoholimetros", etiqueta: "Alcoholímetro", etiquetaSalida: "Alcoholímetros", items: Object.freeze(["ARUJ-0239", "ARLM-0652"]) })
  ])
});

// Solo cambia la presentación de estos dos cargos; el valor emitido conserva
// jerarquía, apellido y nombres completos en el informe.
const PERSONAL_ESPECIAL = Object.freeze({
  JEFE: Object.freeze({ etiqueta: "JEFE", valor: "Subcomisario Choque José María" }),
  SUBJEFE: Object.freeze({ etiqueta: "SUBJEFE", valor: "Inspector Fertonani Sebastián" })
});

export function presentarPersonalOperativo(valor) {
  const original = String(valor ?? "").trim();
  const clave = original.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "").toUpperCase().replace(/\s+/g, " ");
  if (clave === "JEFE" || clave.startsWith("JEFE ") ||
      clave.startsWith("SUBCOMISARIO CHOQUE ") || clave.startsWith("SUBCRIO CHOQUE ")) {
    return PERSONAL_ESPECIAL.JEFE;
  }
  if (clave === "SUBJEFE" || clave.startsWith("SUBJEFE ") ||
      clave.startsWith("INSPECTOR FERTONANI ")) {
    return PERSONAL_ESPECIAL.SUBJEFE;
  }
  return { etiqueta: original, valor: original };
}

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
