import { unirLineas } from "./formatear-lineas.js";

export function construirEncabezadoOperativo({
  titulo,
  horaInicio,
  horaFin,
  lugar,
  tipoNombre,
  tipoOperativo
}) {
  const lineas = [];

  if (titulo) lineas.push(titulo);
  lineas.push(`${horaInicio || "--:--"} A ${horaFin || "--:--"} HS`);
  lineas.push(lugar || "SIN LUGAR");

  if (tipoNombre || tipoOperativo) {
    lineas.push(tipoNombre || tipoOperativo);
  }

  return unirLineas(lineas);
}

export function construirTextoConSecciones(secciones = []) {
  const lineas = [];

  for (const seccion of secciones) {
    if (!seccion) continue;

    if (typeof seccion === "string") {
      if (seccion.trim()) lineas.push(seccion.trim());
      continue;
    }

    if (seccion.titulo) {
      lineas.push(seccion.titulo);
    }

    if (Array.isArray(seccion.lineas)) {
      for (const linea of seccion.lineas) {
        if (String(linea || "").trim()) {
          lineas.push(String(linea).trim());
        }
      }
    }

    lineas.push("");
  }

  return unirLineas(lineas);
}
