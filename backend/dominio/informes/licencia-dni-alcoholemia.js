/**
 * Un único campo visible "Licencia / DNI".
 * La letra inicial identifica la clase de licencia; una secuencia aislada
 * de exactamente ocho dígitos identifica un DNI.
 * Un DNI después de la clase NO convierte la licencia en "sin licencia".
 */
export function interpretarLicenciaDniAlcoholemia(valor) {
  const original = String(valor ?? "").trim();
  const normal = original.toLocaleUpperCase("es-AR")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const limpiarDni = (dato) => {
    const numero = String(dato ?? "").replace(/\D/g, "");
    return numero.length === 8 ? numero : "";
  };
  const dniFormateado = numero => numero ? numero.replace(/^(\d{2})(\d{3})(\d{3})$/, "$1.$2.$3") : "";
  if (!normal) return { tipo: "VACIO", clase: "", dni: "", dniFormateado: "", valido: false };

  // Entrada numérica sin letra: se recibió un DNI, no una clase de licencia.
  const numeroSolo = limpiarDni(normal);
  if (/^[\d\s.\-]+$/.test(normal)) {
    const valido = Boolean(numeroSolo);
    return { tipo: valido ? "DNI" : "INVALIDO", clase: "",
      dni: valido ? numeroSolo : "", dniFormateado: dniFormateado(numeroSolo), valido };
  }

  // Permite también "DNI 27762328" sin confundir DNI con clase.
  const prefijoDni = normal.match(/^D\.?N\.?I\.?(?:\s*(?:N[°ºRO.]*))?[\s:,-]*([\d.\s-]+)$/);
  if (prefijoDni) {
    const dni = limpiarDni(prefijoDni[1]);
    return { tipo: dni ? "DNI" : "INVALIDO", clase: "", dni,
      dniFormateado: dniFormateado(dni), valido: Boolean(dni) };
  }

  // Clase al inicio, con posible DNI al final: B2 27762328 / B2, N°27.762.328.
  const m = normal.match(/^([A-Z]{1,2}\s*\d(?:[.,]\d){0,2})\b(.*)$/);
  if (!m) return { tipo: "INVALIDO", clase: "", dni: "", dniFormateado: "", valido: false };
  const clase = m[1].replace(/\s+/g, "").replace(/,/g, ".");
  const resto = m[2].trim().replace(/^[\s,;:\-]+/, "")
    .replace(/^(?:DNI|N[°º.]?|NRO\.?|NUMERO)\s*[:#°º.-]?\s*/, "");
  if (resto && !/^[\d.\s-]+$/.test(resto)) {
    return { tipo: "INVALIDO", clase, dni: "", dniFormateado: "", valido: false };
  }
  const dni = resto ? limpiarDni(resto) : "";
  if (resto && !dni) return { tipo: "INVALIDO", clase, dni: "", dniFormateado: "", valido: false };
  return { tipo: "LICENCIA", clase, dni, dniFormateado: dniFormateado(dni), valido: true };
}
