// Reglas puras: no dependen del DOM ni de un padrón cargado en el navegador.
const ZONA_HORARIA = "America/Argentina/Cordoba";
const FECHA_ANCLA_UTC = Date.UTC(2026, 8, 27); // Grupo C: 27/09/2026, 06:00.
const ROTACION = Object.freeze(["C", "D", "A", "B"]);

export function resolverGuardia0600(ahora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: ZONA_HORARIA,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", hourCycle: "h23"
    }).formatToParts(ahora).map(({ type, value }) => [type, value])
  );
  const fechaUTC = Date.UTC(+partes.year, +partes.month - 1, +partes.day);
  const guardiaUTC = fechaUTC - (Number(partes.hour) < 6 ? 86400000 : 0);
  const dias = Math.round((guardiaUTC - FECHA_ANCLA_UTC) / 86400000);
  const indice = ((dias % 4) + 4) % 4;
  return {
    grupo: ROTACION[indice],
    guardia_fecha: new Date(guardiaUTC).toISOString().slice(0, 10)
  };
}

export function normalizarClave(valor) {
  return String(valor ?? "").trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ");
}

function formatoNombre(valor) {
  return String(valor ?? "").trim().toLocaleLowerCase("es-AR")
    .replace(/(^|[\s-])([\p{L}])/gu, (_, prefijo, letra) => prefijo + letra.toLocaleUpperCase("es-AR"))
    .replace(/\b(De|Del|Y)\b/g, (conector, indice) => indice === 0 ? conector : conector.toLocaleLowerCase("es-AR"));
}

export function crearCatalogoGuardia(personalFilas = [], movilesFilas = [], ahora = new Date()) {
  const guardia = resolverGuardia0600(ahora);
  const roles = { jefe: [], subjefe: [] };
  const grupoActual = [];
  for (const p of personalFilas) {
    if (p?.activo !== true) continue;
    const rol = normalizarClave(p.rol);
    const nombre = [formatoNombre(p.jerarquia), formatoNombre(p.nombre_apellido)].filter(Boolean).join(" ");
    if (!nombre) continue;
    if (/\b(SUBJEFE|SUB JEFE|SEGUNDO JEFE|2DO JEFE)\b/.test(rol)) {
      roles.subjefe.push(nombre);
    } else if (/\bJEFE\b/.test(rol)) {
      roles.jefe.push(nombre);
    } else if (
      normalizarClave(p.grupo) === guardia.grupo &&
      p.presente === true &&
      normalizarClave(p.situacion_revista) === "SERVICIO EFECTIVO"
    ) {
      grupoActual.push(nombre);
    }
  }

  // Los dos cargos se conservan como opciones identificables si aún no tienen
  // registros con rol Jefe/Subjefe en PERSONAL. No se inventan nombres.
  const personal = unicos([
    ...(roles.jefe.length ? roles.jefe : ["JEFE"]),
    ...(roles.subjefe.length ? roles.subjefe : ["SUBJEFE"]),
    ...grupoActual.sort((a, b) => a.localeCompare(b, "es"))
  ]);

  const vehiculos = (Array.isArray(movilesFilas) ? movilesFilas : [])
    .filter((m) => m?.activo === true && m.condicion === true)
    .map((m) => ({ numero: String(m.numero ?? "").trim(), tipo: normalizarClave(m.tipo) }))
    .filter((m) => /^\d+$/.test(m.numero))
    .sort((a, b) => Number(a.numero) - Number(b.numero));
  return {
    ...guardia,
    personal,
    moviles: unicos(vehiculos.filter((m) => !/MOTO/.test(m.tipo)).map((m) => m.numero)),
    motos: unicos(vehiculos.filter((m) => /MOTO/.test(m.tipo)).map((m) => m.numero))
  };
}

function unicos(valores) {
  const vistos = new Set();
  return valores.filter((valor) => {
    const clave = normalizarClave(valor);
    if (!clave || vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}
