import { extraerCodigosFalta, getNomencladorFalta } from "../finaliza/numerales/nomenclador.js";
import { resolverOrdenesOrigenOperativo, resolverTipoNombreOperativo } from "../compartido/operativo-identidad.js";

const ENCABEZADO_INFORMES = "*POLICÍA DE LA PROVINCIA DE SANTA FE- DIRECCION GENERAL GUARDIA PROVINCIAL - BRIGADA MOTORIZADA ZONA CENTRO NORTE*";

export function construirTextoInformeEspecial(informe) {
  if (!informe) return "";

  if (informe.modelo === "CONTROL_SUPERIOR") {
    return construirControlSuperior(informe);
  }

  if (informe.modelo === "ALCOHOLEMIA_POSITIVA") {
    return construirAlcoholemia(informe);
  }

  if (informe.modelo === "DECRETO_460_22") {
    return construirDecreto46022(informe);
  }

  if (informe.modelo === "CONTROL_ARMAS") {
    return construirControlArmas(informe);
  }

  if (informe.modelo === "RETENCION_LICENCIA") {
    return construirRetencionLicencia(informe);
  }

  if (informe.modelo === "REQUISA_VEHICULAR") {
    return construirRequisaVehicular(informe);
  }

  return "";
}

function construirControlSuperior(informe) {
  const f = informe.formulario || {};
  const recursos = resolverRecursosOperativoInforme(informe);
  const lineas = [
    "*POLICÍA DE LA PROVINCIA DE SANTA FE - GUARDIA PROVINCIAL*",
    "*BRIGADA MOTORIZADA ZONA CENTRO NORTE SANTA FE*",
    "*TERCIO CHARLIE*",
    "",
    "*MOTIVO: CONTROL SUPERIOR*",
    "",
    `*LUGAR:* ${texto(informe.lugar) || "/"}`,
    `*HORA:* ${resolverHoraInforme(informe)} Hs`,
    `*FECHA:* ${resolverFechaInformeDocumento(informe, false)}`,
    "",
    `*OPERATIVO:* ${construirDescripcionOperativo(informe)}`,
    `*HORARIO OPERATIVO:* ${construirHorarioOperativo(informe)}`,
    "",
    "*PERSONAL POLICIAL:*",
    normalizarPersonalInstitucional(recursos.personal) || "/",
    "",
    `*MÓVIL/ES:* ${recursos.moviles || "/"}`,
    "",
    `*OBSERVACIONES:* ${construirObservacionControlSuperior(f)}`
  ];

  return compactarSaltos(lineas.join("\n"));
}

function construirMovilesControlSuperior(f = {}) {
  const moviles = [];
  if (Boolean(f.movil_12428)) moviles.push("12428");
  if (Boolean(f.movil_otro)) {
    const otros = texto(f.moviles_otros)
      .split(/[\s,;/]+/)
      .map((v) => v.trim())
      .filter(Boolean);
    for (const movil of otros) {
      if (!moviles.includes(movil)) moviles.push(movil);
    }
  }
  return moviles.join("/");
}


function construirObservacionControlSuperior(f = {}) {
  const autoridades = [];
  if (Boolean(f.autoridad_jefe)) autoridades.push("JEFE SubCrio. Choque J.M.");
  if (Boolean(f.autoridad_subjefe)) autoridades.push("SUBJEFE Inspector Fertonani Sebastian");
  if (Boolean(f.autoridad_otros) && texto(f.nombre_autoridad)) autoridades.push(texto(f.nombre_autoridad));

  const moviles = construirMovilesControlSuperior(f);
  const plural = autoridades.length > 1;
  const sujeto = unirConY(autoridades) || "la autoridad superior";
  const movilidad = moviles
    ? `${plural || moviles.includes("/") ? " con móvil/es " : " con móvil "}${moviles}`
    : "";

  return `${plural ? "Se hacen presentes" : "Se hace presente"} ${sujeto}${movilidad} realizando control superior y ${plural ? "se acoplan" : "se acopla"} al operativo.`;
}

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

function construirHorarioOperativo(informe = {}) {
  const inicio = texto(informe.hora_inicio) || "--:--";
  const fin = texto(informe.hora_fin) || "--:--";
  return `${inicio} A ${fin}${/\bHS\b/i.test(fin) ? "" : " Hs"}`;
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
  return texto(valor)
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\p{L}/gu, (letra) => letra.toUpperCase());
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

function unirConY(items = []) {
  const lista = items.map(texto).filter(Boolean);
  if (lista.length <= 1) return lista[0] || "";
  if (lista.length === 2) return `${lista[0]} y ${lista[1]}`;
  return `${lista.slice(0, -1).join(", ")} y ${lista.at(-1)}`;
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
  const tipoVehiculo = formatearTipoVehiculoAlcoholemia(
    c.tipo_vehiculo_normalizado || f.tipo_vehiculo
  );
  const marca = texto(f.marca);
  const modelo = texto(f.modelo_vehiculo);
  const dominio = texto(f.dominio);
  const conductor = texto(f.conductor);
  const resultado = formatearNumero(c.resultado).replace(",", ".");
  const condicion = c.sancionable ? "sancionable" : "no sancionable";
  const operativo = construirDescripcionOperativo(informe, { mayusculas: true });

  let descripcionVehiculo = `un vehiculo tipo ${tipoVehiculo || "vehículo"}`;
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

  return partes.join(" ");
}

function construirLicenciaObservacionAlcoholemia(f = {}) {
  const clase = texto(f.clase);
  if (!clase) return "";

  if (contieneDni(clase)) {
    return `NO POSEE LICENCIA DE CONDUCIR, POSEE DNI ${clase}.`;
  }

  return `LICENCIA CLASE ${clase}.`;
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
    FURGON: "FURGÓN",
    FURGONETA: "FURGONETA",
    OTROS: "OTROS"
  };

  return etiquetas[key] || texto(valor).replaceAll("_", " ");
}

function construirDecreto46022(informe) {
  const f = informe.formulario || {};
  const recursos = resolverRecursosOperativoInforme(informe);
  const codigos = extraerCodigosFalta(f.codigos_infraccion);
  const marca = texto(f.marca);
  const modelo = texto(f.modelo_vehiculo);
  const dominio = texto(f.dominio);
  const numeroActa = normalizarNumeroActa(f.numero_acta);
  const operativoCumplimentado = construirDescripcionOperativo(informe, { mayusculas: true });

  const observacion = [
    `Realizando ${operativoCumplimentado} procedemos a la detención en zona segura de un motovehículo marca ${marca} modelo ${modelo}, dominio ${dominio}, labrándose acta de infracción N° ${numeroActa} por el código/s ${codigos.join(", ")}, remitiendo el birrodado al corralón de San Jose del Rincon.`,
    "Labrando acta de inventario.",
    "Cabe destacar que se realizo consulta sobre el vehiculo y persona por posibles requirimientos legales vigentes, con resultados negativos."
  ].join(" ");

  const lineas = [
    "*POLICÍA DE LA PROVINCIA DE SANTA FE - DIRECCION GENERAL GUARDIA PROVINCIAL*",
    "*BRIGADA MOTORIZADA ZONA CENTRO NORTE SANTA FE*",
    "*TERCIO CHARLIE*",
    "",
    "*MOTIVO: REMISIÓN DE MOTOCICLETA POR DECTO 460/22*",
    "",
    `*LUGAR:* ${texto(informe.lugar) || "/"}`,
    `*HORA:* ${resolverHoraInforme(informe)} Hs`,
    `*FECHA:* ${resolverFechaInformeDocumento(informe, true)}`,
    "",
    `*MÓVIL:* ${recursos.moviles || "/"}`,
    "",
    "*PERSONAL*",
    normalizarPersonalInstitucional(recursos.personal) || "/",
    "",
    `*OBSERVACIÓN:* ${observacion}`
  ];

  return compactarSaltos(lineas.join("\n"));
}

function construirControlArmas(informe) {
  const f = informe.formulario || {};
  const recursos = resolverRecursosOperativoInforme(informe);
  const personal = normalizarPersonalControlArmas(primerTexto(f.personal, recursos.personal));
  const moviles = primerTexto(f.moviles, recursos.moviles);
  const lugar = primerTexto(f.lugar_hecho, informe.lugar);
  const fechaHora = construirFechaHora(f.fecha_hecho, f.hora_hecho);

  const lineas = [
    "*POLICIA DE LA PROVINCIA DE SANTA FE -DIRECCION GENERAL GUARDIA PROVINCIAL-BRIGADA MOTORIZADA CENTRO NORTE TERCIO CHARLIE(SANTA FE )*",
    "",
    "*Hecho*: Requisa Vehicular y Transporte de armas de fuego",
    "",
    "*PERSONAL:*",
    personal || "/",
    "",
    `*MOVIL* ${moviles || "/"}`,
    "",
    `*LUGAR*: ${lugar || "/"}`,
    "",
    `*Fecha* ${fechaHora || "/"}`,
    "",
    `*CONTROL DE ARMAMENTO:* ${construirRelatoControlArmas(f)}`
  ];


  return compactarSaltos(lineas.join("\n"));
}

function construirRelatoControlArmas(f = {}) {
  const tipo = tituloControlArmas(f.tipo_vehiculo) || "Vehículo";
  const conductor = texto(f.conductor);
  const cantidad = Number(f.cantidad_armas || 0);
  const tipoArma = tituloControlArmas(f.tipo_arma) || "arma de fuego";
  const documentacion = texto(f.documentacion_armas).toUpperCase();
  const resultado = texto(f.resultado_procedimiento).toUpperCase();
  const detalle = documentacion !== "SIN NOVEDAD" ? texto(f.detalle_armas) : "";
  const observaciones = texto(f.observaciones);

  const cantidadFormateada = cantidad > 0 ? `(${String(Math.trunc(cantidad)).padStart(2, "0")})` : "(00)";
  const sujetoConductor = conductor || "un masculino mayor de edad";

  const partes = [
    `en momentos en que nos encontrábamos cumplimentando operativo de control vehicular, detenemos la marcha de un vehículo *Tipo* ${tipo}, conducido por ${sujetoConductor}, al solicitar la documentación para una mejor identificación del vehículo el cual arroja sin novedad, también se le solicita si nos permite realizar una inspección ocular del interior del vehículo para descartar que no transporte algún elemento de peligrosidad, accediendo sin reparo alguno, observando en el interior del vehiculo ${cantidadFormateada} armas de fuego, siendo ${cantidadFormateada} ${tipoArma}.`
  ];

  if (detalle) {
    partes.push(`Detalle del armamento: ${detalle}.`);
  }

  if (documentacion === "SIN NOVEDAD") {
    partes.push("Se le solicita documentacion arrojando sin novedad.");
  } else if (documentacion) {
    partes.push(`Se le solicita documentacion del armamento, arrojando ${documentacion.toLowerCase()}.`);
  }

  if (resultado === "CONTINÚA SU MARCHA") {
    partes.push("Por lo que una vez constatado que todo está en regla sigue su marcha.");
  } else if (resultado === "SE ADOPTAN MEDIDAS") {
    partes.push("Por lo que se adoptan las medidas correspondientes conforme a las circunstancias del procedimiento.");
  }

  if (observaciones) partes.push(observaciones);

  return partes.join(" ");
}

function normalizarPersonalControlArmas(valor) {
  return texto(valor)
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => {
      const clave = linea.toUpperCase();
      if (clave === "SUBJEFE") return "Sub Jefe de dependencia Inspector Fertonani";
      if (clave === "JEFE") return "Jefe de dependencia SubCrio. Choque J.M.";
      return linea;
    })
    .join("\n");
}

function tituloControlArmas(valor) {
  const limpio = texto(valor).replaceAll("_", " ").replace(/\s+/g, " ").trim();
  if (!limpio) return "";

  return limpio
    .toLocaleLowerCase("es-AR")
    .replace(/(^|[\s/-])\p{L}/gu, (coincidencia) => coincidencia.toLocaleUpperCase("es-AR"));
}

function construirRequisaVehicular(informe) {
  const f = informe.formulario || {};
  const recursos = resolverRecursosOperativoInforme(informe);
  const lugar = primerTexto(f.lugar_hecho, informe.lugar) || "/";
  const fecha = resolverFechaInformeDocumento(
    { ...informe, fecha_informe: primerTexto(f.fecha_hecho, informe.fecha_informe) },
    true
  );
  const horario = primerTexto(f.hora_hecho, resolverHoraInforme(informe)) || "--:--";
  const personal = normalizarPersonalRequisa(primerTexto(f.personal, recursos.personal)) || "/";
  const moviles = normalizarMovilesRequisa(primerTexto(f.moviles, recursos.moviles)) || "/";
  const tipoVehiculo = formatearTipoVehiculoRequisa(f.tipo_vehiculo);
  const dominio = texto(f.dominio) || "/";
  const genero = texto(f.genero).toUpperCase();
  const sujeto = genero === "FEMENINO" ? "una femenina mayor de edad" : "un masculino mayor de edad";
  const pronombre = genero === "FEMENINO" ? "la" : "lo";

  const relato = [
    `en momentos en que nos encontrábamos cumplimentando operativo de control vehicular, detenemos la marcha de un vehículo *Tipo* ${tipoVehiculo}, *Dominio* ${dominio} conducido por ${sujeto},`,
    "se fiscaliza documentación y se consulta preventivamente por sistema por impedimentos legales del vehículo y su/s ocupantes, arrojando sin novedad,",
    `también se ${pronombre} invita a que nos permita realizar una inspección ocular del interior del vehículo para descartar que no transporte algún elemento ilegal, accediendo sin reparo alguno, resultando sin novedad.`,
    "Por lo que una vez constatado que todo está en regla sigue su marcha"
  ].join(" ");

  const lineas = [
    "*POLICIA DE LA PROVINCIA DE SANTA FE -DIRECCION GENERAL GUARDIA PROVINCIAL-BRIGADA MOTORIZADA ZONA CENTRO NORTE*",
    "",
    "*MOTIVO*: Requisa de vehiculo voluntaria",
    "",
    "*PERSONAL:*",
    personal,
    "",
    `*MOVIL* ${moviles}`,
    `*LUGAR*: ${lugar}`,
    `*FECHA* ${fecha} -  ${horario} hs`,
    "",
    `*REQUISA VOLUNTARIA:* ${relato}`,
    "",
    "*Se adjunta vista fotográfica.*"
  ];

  return compactarSaltos(lineas.join("\n"));
}

function normalizarPersonalRequisa(valor) {
  return texto(valor)
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => {
      const clave = linea.toUpperCase();
      if (clave === "SUBJEFE") return "Sub Jefe de dependencia Inspector Fertonani";
      if (clave === "JEFE") return "Jefe de dependencia SubCrio. Choque J.M.";
      return linea;
    })
    .join("\n");
}

function normalizarMovilesRequisa(valor) {
  return texto(valor)
    .split(/[\n,;]+|\s+\/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join("/");
}

function formatearTipoVehiculoRequisa(valor) {
  const limpio = texto(valor).replaceAll("_", " ").replace(/\s+/g, " ").trim();
  return limpio ? limpio.toLocaleLowerCase("es-AR") : "vehículo";
}

function construirRetencionLicencia(informe) {
  const f = informe.formulario || {};
  const lineas = [];
  const motivo = resolverMotivoLicencia(f.motivo_licencia);
  const codigo = texto(f.codigo) || motivo.codigo || "";

  lineas.push(ENCABEZADO_INFORMES);
  lineas.push("");
  lineas.push(`*HECHO:* ${motivo.hecho}${codigo ? ` (CÓD. ${codigo})` : ""}.`);
  lineas.push("");
  agregarLineaNegrita(lineas, "LUGAR", f.lugar_hecho || informe.lugar);
  agregarLineaNegrita(lineas, "LOCALIDAD", f.localidad);
  agregarLineaNegrita(lineas, "FECHA", formatearFechaDocumento(f.fecha_hecho));
  agregarLineaNegrita(lineas, "HORA", texto(f.hora_hecho) ? `${texto(f.hora_hecho)} Hs` : "");
  agregarLineaNegrita(lineas, "MÓVIL", f.moviles);
  lineas.push("");
  agregarBloque(lineas, "*PERSONAL POLICIAL:*", f.personal);
  lineas.push("");
  lineas.push(`*RELATO:* ${construirRelatoRetencionLicencia(f, motivo, codigo)}`);

  if (texto(f.observaciones)) {
    lineas.push("");
    lineas.push(`*OBSERVACIONES:* ${texto(f.observaciones)}`);
  }

  if (Array.isArray(informe.fotos) && informe.fotos.length > 0) {
    lineas.push("");
    lineas.push("Se adjuntan vistas fotográficas.");
  }

  return lineas.filter((linea, indice, arr) => linea !== "" || arr[indice - 1] !== "").join("\n").trim();
}

function construirRelatoRetencionLicencia(f, motivo, codigo) {
  const tipo = texto(f.tipo_vehiculo);
  const dominio = texto(f.dominio);
  const marca = texto(f.marca);
  const modelo = texto(f.modelo_vehiculo);
  const conductor = texto(f.conductor);
  const dni = texto(f.dni);
  const clase = texto(f.clase_licencia);
  const fechaVto = formatearFechaDocumento(f.fecha_vencimiento);
  const numeroActa = texto(f.numero_acta);

  let licenciaDetalle = motivo.relato;
  if (motivo.requiereVencimiento && fechaVto) {
    licenciaDetalle += ` con fecha ${fechaVto}`;
  } else if (motivo.key === "CADUCA_CAMBIO_DATOS" && fechaVto) {
    licenciaDetalle = `VTO con fecha ${fechaVto}, la cual se constata que está caduca por cambio de datos`;
  }

  const vehiculo = [
    tipo ? `TIPO: ${tipo}` : "",
    dominio ? `DOMINIO: ${dominio}` : "",
    marca ? `MARCA: ${marca}` : "",
    modelo ? `MODELO: ${modelo}` : ""
  ].filter(Boolean).join(", ");

  const partes = [
    `Se informa a la superioridad que se detiene la marcha de un vehículo${vehiculo ? ` *${vehiculo}*` : ""}, conducido por ${conductor || "persona identificada"}${dni ? `, DNI ${dni}` : ""}, el cual presenta *LICENCIA DE CONDUCIR${clase ? ` CLASE ${clase}` : ""}, ${licenciaDetalle}*.`
  ];

  if (numeroActa || codigo) {
    const acta = numeroActa ? `Acta de Infracción de Tránsito y cédula de notificación N° ${numeroActa}` : "Acta de Infracción de Tránsito";
    partes.push(`Se labra ${acta}${codigo ? `, Código N° ${codigo}` : ""}.`);
  }

  const medidas = [];
  if (Boolean(f.retencion_licencia)) medidas.push("se retiene Licencia Nacional de Conducir");
  if (Boolean(f.remision_rodado)) medidas.push("se realiza remisión del rodado");
  if (Boolean(f.prohibicion_circular)) medidas.push("se dispone prohibición de circular");

  if (medidas.length) {
    partes.push(`Como medida cautelar ${unirMedidas(medidas)}.`);
  }

  return partes.join(" ");
}

function resolverMotivoLicencia(valor) {
  const key = texto(valor).toUpperCase();
  const mapa = {
    VENCIDA_MAS_6_MESES: {
      key: "VENCIDA_MAS_6_MESES",
      hecho: "Retención de licencia por vencimiento por más de 6 meses",
      relato: "VENCIDA",
      codigo: "9136",
      requiereVencimiento: true
    },
    VENCIDA_MENOS_6_MESES: {
      key: "VENCIDA_MENOS_6_MESES",
      hecho: "Retención de licencia por vencimiento por menos de 6 meses",
      relato: "VENCIDA",
      codigo: "9123",
      requiereVencimiento: true
    },
    CADUCA_CAMBIO_DATOS: {
      key: "CADUCA_CAMBIO_DATOS",
      hecho: "Retención de licencia caduca por cambios de datos",
      relato: "CADUCA POR CAMBIO DE DATOS",
      codigo: "9140",
      requiereVencimiento: false
    },
    MAL_OTORGADA: {
      key: "MAL_OTORGADA",
      hecho: "Retención de licencia mal otorgada",
      relato: "MAL OTORGADA",
      codigo: "9153",
      requiereVencimiento: false
    }
  };

  return mapa[key] || {
    key,
    hecho: "Retención de licencia",
    relato: "CON IRREGULARIDAD",
    codigo: "",
    requiereVencimiento: false
  };
}

function unirMedidas(medidas) {
  if (medidas.length <= 1) return medidas[0] || "";
  if (medidas.length === 2) return `${medidas[0]} y ${medidas[1]}`;
  return `${medidas.slice(0, -1).join(", ")} y ${medidas.at(-1)}`;
}

function agregarLineaNegrita(lineas, etiqueta, valor) {
  const v = texto(valor);
  if (v) lineas.push(`*${etiqueta}:* ${v}`);
}

function agregarBloque(lineas, titulo, valor) {
  const v = texto(valor);
  if (!v) return;
  lineas.push(titulo);
  lineas.push(v);
}

function construirFechaHora(fecha, hora) {
  const f = formatearFechaDocumento(fecha);
  const h = texto(hora);
  if (f && h) return `${f} - ${h} hs`;
  return f || (h ? `${h} hs` : "");
}

function formatearFechaDocumento(valor) {
  const v = texto(valor);
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

function texto(valor) {
  return String(valor || "").trim();
}

function agregarNumeralesSugeridos(lineas, informe) {
  const items = Array.isArray(informe.numerales_sugeridos) ? informe.numerales_sugeridos : [];

  if (!items.length) return;

  lineas.push("NUMERALES SUGERIDOS:");
  for (const item of items) {
    lineas.push(`${item.codigo} x${item.cantidad || 1} - ${item.detalle}`);
  }
}

function construirTextoLicencia(f) {
  const clase = String(f.clase || "").trim();

  if (Boolean(f.licencia_digital) && clase) {
    return `LICENCIA: POSEE LICENCIA DIGITAL CLASE ${clase}`;
  }

  if (!Boolean(f.licencia_digital) && clase && contieneDni(clase)) {
    return `LICENCIA: NO POSEE LICENCIA DE CONDUCIR, POSEE DNI ${clase}`;
  }

  if (clase) {
    return `LICENCIA: CLASE ${clase}`;
  }

  return "";
}

function contieneDni(valor) {
  const texto = String(valor || "");
  return /\d{7,8}/.test(texto);
}

function resumenOperativo(informe) {
  const horario = `${informe.hora_inicio || "--:--"} A ${informe.hora_fin || "--:--"} HS`;
  const lugar = informe.lugar || "SIN LUGAR";
  const tipo = String(informe.tipo_operativo || "OPERATIVO").replaceAll("_", " ");

  return `${horario} - ${lugar} - ${tipo}`;
}

function agregarLinea(lineas, etiqueta, valor) {
  const texto = String(valor || "").trim();

  if (texto) {
    lineas.push(`${etiqueta}: ${texto}`);
  }
}

function formatearNumero(valor) {
  const n = Number(valor || 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2).replace(".", ",");
}
