// Salida institucional encapsulada: ALCOHOLEMIA_POSITIVA
import { extraerCodigosFalta, getNomencladorFalta } from "../../../finaliza/numerales/nomenclador.js";
import { resolverOrdenesOrigenOperativo, resolverTipoNombreOperativo } from "../../../compartido/operativo-identidad.js";
import { interpretarLicenciaDniAlcoholemia } from "../../licencia-dni-alcoholemia.js";
import { formatearTituloOperativo } from "../../../compartido/texto/formato-titulos-operativos.js";
import { resolverLugarProcedimiento46022 } from "../../../compartido/lugares/lugar-procedimiento-460-22.js";

const ENCABEZADO_INFORMES = "*POLICÍA DE LA PROVINCIA DE SANTA FE- DIRECCION GENERAL GUARDIA PROVINCIAL - BRIGADA MOTORIZADA ZONA CENTRO NORTE*";

function resolverRecursosOperativoInforme(informe = {}) {
  const operativo = informe?.operativo || {};
  const datos = objeto(operativo?.datos);
  const snapshot = objeto(datos?.inicio_snapshot);

  return {
    personal: primerTexto(
      snapshot.personal,
      operativo.personal,
      operativo.personal_inicio,
      datos.personal_inicio,
      datos.personal
    ),
    moviles: primerTexto(
      snapshot.moviles_motos,
      operativo.moviles_motos,
      datos.moviles_motos,
      datos.movilidad,
      unirMovilidad(datos.moviles, datos.motos)
    )
  };
}

function construirDescripcionOperativo(informe = {}, { mayusculas = false } = {}) {
  const operativo = informe?.operativo || {};
  const tipoFuente = resolverTipoNombreOperativo(informe, operativo);
  const tipo = mayusculas
    ? texto(tipoFuente).replaceAll("_", " ").replace(/\s+/g, " ").toUpperCase()
    : tituloDocumento(tipoFuente);

  const numerosEnTipo = new Set(extraerNumerosOrden(tipoFuente));
  const ordenes = resolverOrdenesOrigenOperativo(informe, operativo)
    .map(normalizarOrdenDocumento)
    .filter(Boolean)
    .filter((orden) => {
      const numeros = extraerNumerosOrden(orden);
      return !numeros.length || numeros.some((numero) => !numerosEnTipo.has(numero));
    });

  if (!ordenes.length) return tipo || "OPERATIVO";
  return `${tipo || "OPERATIVO"} ${ordenes.join(" / ")}`.trim();
}

function resolverHoraInforme(informe = {}) {
  const directa = texto(informe.hora_informe);
  if (/^\d{1,2}:\d{2}$/.test(directa)) return directa;

  const fecha = new Date(informe.fecha || Date.now());
  if (!Number.isNaN(fecha.getTime())) {
    return `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
  }

  return "--:--";
}

function resolverFechaInformeDocumento(informe = {}, rellenar = true) {
  const candidata = primerTexto(informe.fecha_informe, informe.formulario?.fecha_hecho, informe.fecha);
  let m = candidata.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const dia = rellenar ? m[3].padStart(2, "0") : String(Number(m[3]));
    const mes = rellenar ? m[2].padStart(2, "0") : String(Number(m[2]));
    return `${dia}/${mes}/${m[1]}`;
  }

  m = candidata.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dia = rellenar ? m[1].padStart(2, "0") : String(Number(m[1]));
    const mes = rellenar ? m[2].padStart(2, "0") : String(Number(m[2]));
    return `${dia}/${mes}/${m[3]}`;
  }

  const fecha = new Date(candidata || Date.now());
  const valida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  const dia = rellenar ? String(valida.getDate()).padStart(2, "0") : String(valida.getDate());
  const mes = rellenar ? String(valida.getMonth() + 1).padStart(2, "0") : String(valida.getMonth() + 1);
  return `${dia}/${mes}/${valida.getFullYear()}`;
}

function normalizarPersonalInstitucional(valor) {
  const equivalencias = {
    JEFE: "JEFE SubCrio. Choque J.M.",
    SUBJEFE: "SUBJEFE Inspector Fertonani S."
  };

  return texto(valor)
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => equivalencias[linea.toUpperCase()] || linea)
    .join("\n");
}

function tituloDocumento(valor) {
  return formatearTituloOperativo(valor);
}

function normalizarOrdenDocumento(valor) {
  return texto(valor)
    .replace(/\s*\/\s*/g, "/")
    .replace(/\bN(?:RO|º|°)?\s*(?=\d)/gi, "N°")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarNumeroActa(valor) {
  return texto(valor)
    .replace(/^N(?:RO|º|°)?\s*/i, "")
    .trim();
}

function extraerNumerosOrden(valor) {
  return (texto(valor).match(/\b\d{1,6}\s*\/\s*\d{2,4}\b/g) || [])
    .map((item) => item.replace(/\s+/g, ""));
}

function unirMovilidad(moviles, motos) {
  const lista = [];
  for (const valor of [moviles, motos]) {
    if (Array.isArray(valor)) lista.push(...valor.map(texto).filter(Boolean));
    else if (texto(valor)) lista.push(texto(valor));
  }
  return lista.join(" / ");
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

function compactarSaltos(valor) {
  return String(valor || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function construirAlcoholemia(informe) {
  const f = informe.formulario || {};
  const c = informe.calculos || {};
  const recursos = resolverRecursosOperativoInforme(informe);
  const codigoSancionable = texto(c.codigo_sancionable);
  const motivo = c.sancionable
    ? codigoSancionable === "2033"
      ? "ALCOHOLEMIA POSITIVA SANCIONABLE PROFESIONAL"
      : "ALCOHOLEMIA POSITIVA SANCIONABLE"
    : "ALCOHOLEMIA POSITIVA NO SANCIONABLE";
  const observacion = construirObservacionAlcoholemia(informe, f, c);

  const lineas = [
    "*POLICÍA DE LA PROVINCIA DE SANTA FE - DIRECCION GENERAL GUARDIA PROVINCIAL*",
    "*BRIGADA MOTORIZADA ZONA CENTRO NORTE SANTA FE*",
    "*TERCIO CHARLIE*",
    "",
    `*MOTIVO: ${motivo}*`,
    "",
    `*LUGAR:* ${texto(informe.lugar) || "/"}`,
    "",
    `*HORA:* ${resolverHoraInforme(informe)}HS`,
    "",
    `*FECHA:* ${resolverFechaInformeDocumento(informe, true)}`,
    "",
    `*MÓVIL:* ${recursos.moviles || "/"}`,
    "",
    "*PERSONAL*",
    normalizarPersonalInstitucional(recursos.personal) || "/",
    "",
    `*OBSERVACIÓN:* ${observacion || "/"}`
  ];

  return compactarSaltos(lineas.join("\n"));
}

function construirObservacionAlcoholemia(informe, f = {}, c = {}) {
  const tipoVehiculo = mayusculasDocumento(formatearTipoVehiculoAlcoholemia(
    c.tipo_vehiculo_normalizado || f.tipo_vehiculo
  ));
  const marca = texto(f.marca).toLocaleUpperCase("es-AR");
  const modelo = texto(f.modelo_vehiculo).toLocaleUpperCase("es-AR");
  const dominio = texto(f.dominio).toLocaleUpperCase("es-AR");
  const conductor = texto(f.conductor).toLocaleUpperCase("es-AR");
  const resultado = formatearNumero(c.resultado).replace(",", ".");
  const condicion = c.sancionable ? "sancionable" : "no sancionable";
  const operativo = construirDescripcionOperativo(informe, { mayusculas: true });

  let descripcionVehiculo = `un vehículo tipo ${tipoVehiculo || "vehículo"}`;
  if (marca) descripcionVehiculo += ` marca ${marca}`;
  if (modelo) descripcionVehiculo += ` modelo ${modelo}`;
  if (dominio) descripcionVehiculo += `, dominio ${dominio}`;
  if (conductor) descripcionVehiculo += `, conducido por ${conductor}`;

  const partes = [
    `En momentos que nos encontrábamos realizando ${operativo} se detiene la marcha de ${descripcionVehiculo}, constatando que circula con alcoholemia positiva ${condicion} de ${resultado} G/L.`
  ];

  const numeroActa = normalizarNumeroActa(f.numero_acta);
  const codigos = construirCodigosAlcoholemia(f, c);
  if (numeroActa) {
    partes.push(
      `Se labró acta de infracción N° ${numeroActa}${codigos.length ? ` por código/s ${codigos.join(" / ")}` : ""}.`
    );
  }

  const licencia = construirLicenciaObservacionAlcoholemia(f);
  if (licencia) partes.push(licencia);

  const medidas = construirMedidasCautelaresAlcoholemia(f);
  if (medidas.length) {
    partes.push(`Como medida cautelar se realizó ${medidas.join(", ")}.`);
  }

  if (Boolean(c.con_decreto_460_22)) {
    partes.push("También se realizó el procedimiento correspondiente conforme Decreto 460/22.");
  }

  const juzgado = resolverJuzgadoAlcoholemia(f);
  if (juzgado) partes.push(`Juzgado interviniente: ${juzgado}.`);

  return partes.join(" ");
}

function resolverJuzgadoAlcoholemia(f = {}) {
  const codigos = {
    "SANTA FE": "SANTA FE", RINCON: "RINCÓN", RECREO: "RECREO",
    "SAUCE VIEJO": "SAUCE VIEJO", "SANTO TOME": "SANTO TOMÉ"
  };
  const elegido = texto(f.juzgado).toLocaleUpperCase("es-AR");
  if (elegido === "OTRO") return texto(f.juzgado_otro).toLocaleUpperCase("es-AR");
  return codigos[elegido] || "";
}

function construirLicenciaObservacionAlcoholemia(f = {}) {
  const dato = interpretarLicenciaDniAlcoholemia(f.clase);
  if (!dato.valido) return "";
  if (dato.tipo === "DNI") return `Posee DNI N° ${dato.dniFormateado}.`;
  const soporte = Boolean(f.licencia_digital) ? "Digital" : "Física";
  const detalle = dato.clases.length > 1 ? "clases " + dato.clases.slice(0, -1).join(", ") + " y " + dato.clases.at(-1) : "clase " + dato.clase;
  return `Posee licencia de conducir ${soporte} ${detalle}`+
    (dato.dni ? `, N° ${dato.dniFormateado}` : "")+".";
}

function construirCodigosAlcoholemia(f = {}, c = {}) {
  const codigos = [];

  if (Boolean(c.sancionable) && texto(c.codigo_sancionable)) {
    codigos.push(texto(c.codigo_sancionable));
  }

  for (const codigo of extraerCodigosFalta(f.otros_codigos)) {
    if (!codigos.includes(codigo)) codigos.push(codigo);
  }

  return codigos;
}

function construirMedidasCautelaresAlcoholemia(f = {}) {
  const medidas = [];
  if (Boolean(f.medida_prohibicion)) medidas.push("PROHIBICIÓN DE CIRCULAR");
  if (Boolean(f.medida_cesion)) medidas.push("CESIÓN DE CONDUCCIÓN");
  if (Boolean(f.medida_remision)) medidas.push("REMISIÓN DEL VEHÍCULO");
  if (Boolean(f.medida_retencion)) medidas.push("RETENCIÓN DE LICENCIA DE CONDUCIR");
  return medidas;
}

function formatearTipoVehiculoAlcoholemia(valor) {
  const key = texto(valor)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

  const etiquetas = {
    MOTO: "MOTO / MOTOVEHÍCULO",
    CAMION: "CAMIÓN",
    TRANSPORTE: "TRANSPORTE DE PASAJEROS",
    TRANSPORTE_PASAJEROS: "TRANSPORTE DE PASAJEROS",
    CHASIS: "CHASIS",
    CHASIS_CON_CABINA: "CHASIS CON CABINA",
    CHASIS_SIN_CABINA: "CHASIS SIN CABINA",
    TRACTOR: "TRACTOR DE CARRETERA",
    TRACTOR_CARRETERA: "TRACTOR DE CARRETERA",
    CARRETON: "CARRETÓN",
    AUTO: "AUTO",
    SEDAN: "SEDÁN",
    PICK_UP: "PICK UP",
    CAMIONETA: "CAMIONETA",
    RURAL: "RURAL",
    FURGON: "FURGÓN",
    FURGONETA: "FURGONETA",
    OTROS: "OTROS"
  };

  return etiquetas[key] || texto(valor).replaceAll("_", " ");
}

function texto(valor) {
  return String(valor || "").trim();
}

function mayusculasDocumento(valor) {
  return texto(valor).toLocaleUpperCase("es-AR");
}

function formatearNumero(valor) {
  const n = Number(valor || 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2).replace(".", ",");
}

export { construirAlcoholemia as construirInforme };
