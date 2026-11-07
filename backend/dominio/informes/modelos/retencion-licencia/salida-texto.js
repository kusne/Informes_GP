// Salida institucional encapsulada: RETENCION_LICENCIA
import { extraerCodigosFalta, getNomencladorFalta } from "../../../finaliza/numerales/nomenclador.js";
import { resolverOrdenesOrigenOperativo, resolverTipoNombreOperativo } from "../../../compartido/operativo-identidad.js";
import { interpretarLicenciaDniAlcoholemia } from "../../licencia-dni-alcoholemia.js";
import { formatearTituloOperativo } from "../../../compartido/texto/formato-titulos-operativos.js";
import { resolverLugarProcedimiento46022 } from "../../../compartido/lugares/lugar-procedimiento-460-22.js";

const ENCABEZADO_INFORMES = "*POLICÍA DE LA PROVINCIA DE SANTA FE- DIRECCION GENERAL GUARDIA PROVINCIAL - BRIGADA MOTORIZADA ZONA CENTRO NORTE*";

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
  const tipo = mayusculasDocumento(f.tipo_vehiculo);
  const dominio = mayusculasDocumento(f.dominio);
  const marca = texto(f.marca);
  const modelo = mayusculasDocumento(f.modelo_vehiculo);
  const conductor = texto(f.conductor);
  const dni = texto(f.dni);
  const clase = mayusculasDocumento(f.clase_licencia);
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

function formatearFechaDocumento(valor) {
  const v = texto(valor);
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

function texto(valor) {
  return String(valor || "").trim();
}

function mayusculasDocumento(valor) {
  return texto(valor).toLocaleUpperCase("es-AR");
}

export { construirRetencionLicencia as construirInforme };
