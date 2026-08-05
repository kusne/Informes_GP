import { registrarInformeModulo } from "../../../../backend/aplicacion/estado/informes-coordinador.js";
import { cargarFotosDeFormulario } from "../../../servicios/fotos/fotos-formulario-loader.js";
import { validarInformeEspecial } from "../../../../backend/dominio/informes/informe-especial-validaciones.js";
import { construirTextoInformeEspecial } from "../../../../backend/dominio/informes/informe-especial-salida-texto.js";
import { mapearInformeEspecialParaSupabase } from "../../../../backend/dominio/informes/informe-especial-mapper-supabase.js";
import {
  construirNumeralesSugeridosInforme,
  construirIncrementosSugeridosInforme
} from "../../../../backend/dominio/informes/informe-especial-reglas-numerales.js";

export async function iniciarModeloInformeEspecial({
  form,
  modelo,
  operativoSeleccionado,
  getContexto
} = {}) {
  if (!form) {
    registrarInformeModulo({
      actual: null,
      errores: ["No se encontró el formulario del informe especial."],
      texto: "",
      supabasePayload: null
    });
    return;
  }

  autocompletarDesdeOperativo(form, operativoSeleccionado);

  await cargarFotosDeFormulario({
    form,
    contexto: {
      ...resolverContexto(getContexto),
      operativoSeleccionado
    }
  });

  const actualizar = () => {
    const actual = construirInformeEspecialDesdeFormulario({
      form,
      modelo,
      operativoSeleccionado,
      contexto: resolverContexto(getContexto)
    });

    const errores = validarInformeEspecial(actual);
    const texto = construirTextoInformeEspecial(actual);
    const supabasePayload = mapearInformeEspecialParaSupabase({
      ...actual,
      texto
    });

    registrarInformeModulo({
      actual,
      errores,
      texto,
      supabasePayload
    });
  };

  form.addEventListener("input", actualizar);
  form.addEventListener("change", actualizar);
  form.addEventListener("keyup", actualizar);
  form.addEventListener("paste", () => setTimeout(actualizar, 0));

  actualizar();
}

export function construirInformeEspecialDesdeFormulario({
  form,
  modelo,
  operativoSeleccionado,
  contexto = {}
} = {}) {
  const formulario = leerDatosFormulario(form);
  const modeloNormalizado = normalizarModelo(modelo || form?.dataset?.modeloInforme || "");
  const fotoPrefijo = form?.dataset?.fotoPrefijo || "";
  const fotos = fotoPrefijo ? (window.InformesGP?.fotos?.[fotoPrefijo] || []) : [];

  const ahora = new Date();

  const base = {
    modo: "INFORMES",
    modelo: modeloNormalizado,
    fecha: ahora.toISOString(),
    fecha_informe: formatearFechaLocalISO(ahora),
    hora_informe: formatearHoraLocal(ahora),
    guardia_fecha: resolverGuardiaFecha({
      operativoSeleccionado,
      contexto
    }),
    operativo: operativoSeleccionado || null,
    operativo_key: operativoSeleccionado?.operativo_key || "",
    tipo_operativo: normalizarTipo(operativoSeleccionado?.tipo_operativo || "GENERICO"),
    hora_inicio: operativoSeleccionado?.hora_inicio || "",
    hora_fin: operativoSeleccionado?.hora_fin || "",
    lugar: operativoSeleccionado?.lugar || "",
    formulario,
    foto_prefijo: fotoPrefijo,
    fotos,
    calculos: calcularDatosModelo(modeloNormalizado, formulario)
  };

  const numeralesSugeridos = construirNumeralesSugeridosInforme(base);
  const incrementosSugeridos = construirIncrementosSugeridosInforme(base);

  return {
    ...base,
    numerales_sugeridos: numeralesSugeridos,
    incrementos_sugeridos: incrementosSugeridos,
    calculos: {
      ...base.calculos,
      incrementos_sugeridos: incrementosSugeridos,
      numerales_sugeridos: numeralesSugeridos
    }
  };
}

export function leerDatosFormulario(form) {
  const datos = {};

  if (!form) return datos;

  const campos = form.querySelectorAll("[name]");

  for (const campo of campos) {
    const nombre = campo.getAttribute("name");
    if (!nombre) continue;

    if (campo.type === "checkbox") {
      datos[nombre] = Boolean(campo.checked);
      continue;
    }

    if (campo.type === "radio") {
      if (campo.checked) {
        datos[nombre] = limpiarValor(campo.value);
      }
      continue;
    }

    datos[nombre] = limpiarValor(campo.value);
  }

  return datos;
}

function autocompletarDesdeOperativo(form, operativo = {}) {
  if (!form || !operativo) return;

  const datos = operativo?.datos && typeof operativo.datos === "object" ? operativo.datos : {};
  const fecha = fechaOperativoISO(operativo);
  const lugar = primerValor(operativo.lugar, operativo.qth, operativo.ubicacion, datos.lugar, datos.qth, datos.ubicacion);
  const personal = primerValor(operativo.personal, datos.personal, datos.personal_policial);
  const moviles = primerValor(operativo.moviles_motos, datos.moviles_motos, datos.moviles, datos.movilidad);

  completarCampoSiVacio(form, ["fecha_hecho", "fecha_operativo", "fecha"], fecha);
  completarCampoSiVacio(form, ["lugar_hecho", "lugar"], lugar);
  completarCampoSiVacio(form, ["personal", "personal_policial"], personal);
  completarCampoSiVacio(form, ["moviles", "moviles_motos", "movilidad"], moviles);
}

function completarCampoSiVacio(form, nombres, valor) {
  if (!valor) return;
  for (const nombre of nombres) {
    const campo = form.querySelector(`[name="${nombre}"]`);
    if (!campo || String(campo.value || "").trim()) continue;
    campo.value = String(valor).trim();
    break;
  }
}

function fechaOperativoISO(operativo = {}) {
  const valor = primerValor(operativo.fecha_operativo, operativo.guardia_fecha, operativo.fecha);
  const match = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function primerValor(...valores) {
  for (const valor of valores) {
    const limpio = String(valor ?? "").trim();
    if (limpio) return limpio;
  }
  return "";
}

function calcularDatosModelo(modelo, formulario) {
  if (modelo === "ALCOHOLEMIA_POSITIVA") {
    const tipoVehiculo = normalizarTipoVehiculo(formulario.tipo_vehiculo);
    const resultado = Number(formulario.resultado || 0);
    const limite = resolverLimiteAlcoholemia(tipoVehiculo);
    const sancionable = Number.isFinite(resultado) && resultado > limite;

    return {
      tipo_vehiculo_normalizado: tipoVehiculo,
      resultado,
      limite,
      sancionable,
      codigo_sancionable: resolverCodigoSancionable(tipoVehiculo),
      licencia_digital: Boolean(formulario.licencia_digital),
      con_decreto_460_22: Boolean(formulario.con_decreto_460_22)
    };
  }

  if (modelo === "DECRETO_460_22") {
    return {
      procedimiento_460_22: true
    };
  }

  if (modelo === "CONTROL_ARMAS") {
    return {
      control_armas: true,
      cantidad_armas: Number(formulario.cantidad_armas || 0)
    };
  }

  if (modelo === "RETENCION_LICENCIA") {
    return {
      retencion_licencia: true,
      motivo_licencia: formulario.motivo_licencia || "",
      codigo: formulario.codigo || resolverCodigoLicencia(formulario.motivo_licencia)
    };
  }

  return {};
}

function resolverCodigoLicencia(motivo) {
  const key = String(motivo || "").trim().toUpperCase();
  if (key === "VENCIDA_MAS_6_MESES") return "9136";
  if (key === "CADUCA_CAMBIO_DATOS") return "9140";
  return "";
}

function resolverLimiteAlcoholemia(tipoVehiculo) {
  if (tipoVehiculo === "MOTO") return 0.20;

  if (["TRANSPORTE", "CAMION", "CHASIS", "TRACTOR", "CARRETON"].includes(tipoVehiculo)) {
    return 0;
  }

  return 0.50;
}

function resolverCodigoSancionable(tipoVehiculo) {
  if (tipoVehiculo === "MOTO") return "2020";

  if (["TRANSPORTE", "CAMION", "CHASIS", "TRACTOR", "CARRETON"].includes(tipoVehiculo)) {
    return "2033";
  }

  return "2016";
}

function normalizarTipoVehiculo(valor) {
  const texto = normalizarTexto(valor);

  if (texto.includes("MOTO")) return "MOTO";
  if (texto.includes("TRANSPORTE")) return "TRANSPORTE";
  if (texto.includes("CAMION")) return "CAMION";
  if (texto.includes("CHASIS")) return "CHASIS";
  if (texto.includes("TRACTOR")) return "TRACTOR";
  if (texto.includes("CARRETON")) return "CARRETON";
  if (texto.includes("CAMIONETA") || texto.includes("PICK")) return "CAMIONETA";

  return texto || "";
}

function resolverGuardiaFecha({ operativoSeleccionado, contexto }) {
  return String(
    operativoSeleccionado?.guardia_fecha ||
    contexto?.guardia_fecha ||
    contexto?.guardiaFecha ||
    window.InformesGP?.guardiaFecha ||
    ""
  ).trim();
}

function resolverContexto(getContexto) {
  if (typeof getContexto !== "function") return {};

  try {
    return getContexto() || {};
  } catch {
    return {};
  }
}

function formatearFechaLocalISO(fecha) {
  return `${fecha.getFullYear()}-${pad2(fecha.getMonth() + 1)}-${pad2(fecha.getDate())}`;
}

function formatearHoraLocal(fecha) {
  return `${pad2(fecha.getHours())}:${pad2(fecha.getMinutes())}`;
}

function pad2(valor) {
  return String(valor).padStart(2, "0");
}

function limpiarValor(valor) {
  if (valor === null || valor === undefined) return "";

  return String(valor)
    .replace(/\r\n/g, "\n")
    .trim();
}

function normalizarModelo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

function normalizarTipo(valor) {
  return String(valor || "GENERICO")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}