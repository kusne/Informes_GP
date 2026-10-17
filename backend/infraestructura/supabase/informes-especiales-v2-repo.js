import { obtenerEstadoOperativoV2 } from "./operativos-estado-v2-repo.js";
import { obtenerSupabaseClient, TABLAS_SUPABASE } from "./supabase-client.js";
import { dotacionVigenteOperativo } from "./movimientos-recursos-repo.js";
import { crearAcopleDesdeControlSuperior } from "../../dominio/informes/control-superior-acople.js";
import { buscarInformePorKey } from "./informes-intradiarios-v2-repo.js";
import {
  crearResultadoSupabaseSaltado,
  crearResultadoSupabaseOk,
  supabaseDisponible
} from "./supabase-client.js";
import {
  guardarInformeIntradiarioV2,
  listarInformesIntradiariosV2
} from "./informes-intradiarios-v2-repo.js";
import {
  reemplazarItemsInformeIntradiarioV2
} from "./informes-intradiarios-items-v2-repo.js";

export async function guardarInformeEspecialV2(payload) {
  const limpio = limpiarPayloadInformeEspecial(payload || {});
  validarInformeEspecial(limpio);

  if (!supabaseDisponible()) {
    return crearResultadoSupabaseSaltado("Supabase no configurado. Informe no persistido.");
  }

  // Prevalidar antes de grabar el informe. El acople queda asociado a ESTE
  // informe (un documento, dos eventos), sin crear un segundo informe.
  let acople=null,estadoAnterior=null;
  if(limpio.tipo_informe==="CONTROL_SUPERIOR" && limpio.datos?.se_acopla===true){
    estadoAnterior=await obtenerEstadoOperativoV2({
      operativo_key:limpio.operativo_key,guardia_fecha:limpio.guardia_fecha
    });
    if(!estadoAnterior || estadoAnterior.estado!=="EN_CURSO")
      throw Error("SE ACOPLA sólo puede aplicarse a un operativo EN CURSO.");
    const movimientos=Array.isArray(estadoAnterior.datos?.movimientos_recursos)
      ? estadoAnterior.datos.movimientos_recursos:[];
    if(movimientos.some(m=>m.origen==="CONTROL_SUPERIOR"&&m.informe_key===limpio.informe_key))
      throw Error("Este CONTROL SUPERIOR ya tiene registrado su ACOPLE.");
    acople=crearAcopleDesdeControlSuperior({
      formulario:limpio.datos,actual:dotacionVigenteOperativo(estadoAnterior),
      informe_key:limpio.informe_key
    });
  }
  // Validar el estado ANTES de persistir. PROCEDIMIENTO no finaliza el
  // operativo ni modifica el estado del INICIO/los recursos asignados.
  const esProcedimiento=limpio.tipo_informe==="PROCEDIMIENTO";
  if(esProcedimiento){
    estadoAnterior=await obtenerEstadoOperativoV2({
      operativo_key:limpio.operativo_key,guardia_fecha:limpio.guardia_fecha
    });
    if(!estadoAnterior||!["EN_CURSO","EN_PROCEDIMIENTO"].includes(estadoAnterior.estado))
      throw Error("PROCEDIMIENTO requiere un operativo iniciado y aún no FINALIZADO.");
  }
  const informeExistente=(acople||esProcedimiento)
    ? await buscarInformePorKey(limpio.informe_key) : null;
  const resultadoInforme = await guardarInformeIntradiarioV2(limpio);
  const informe = resultadoInforme?.data || null;

  if (!informe?.id) {
    throw new Error("Supabase no devolvió id del informe intradiario guardado.");
  }

  const items = construirItemsInformeEspecial({
    informe,
    payload: limpio
  });

  const resultadoItems = await reemplazarItemsInformeIntradiarioV2(informe.id, items);

  if(esProcedimiento){
    const actualizado=construirTransicionProcedimiento(estadoAnterior,limpio,informe);
    let query=obtenerSupabaseClient().from(TABLAS_SUPABASE.operativosEstado)
      .update(actualizado)
      .eq("id",estadoAnterior.id)
      .in("estado",["EN_CURSO","EN_PROCEDIMIENTO"]);
    if(estadoAnterior.updated_at) query=query.eq("updated_at",estadoAnterior.updated_at);
    const {data:confirmacion,error:cambioError}=await query.select("id").maybeSingle();
    if(cambioError || !confirmacion){
      if(!informeExistente){
        try{await obtenerSupabaseClient().from(TABLAS_SUPABASE.informesIntradiarios)
          .update({activo:false}).eq("id",informe.id).eq("informe_key",limpio.informe_key);}
        catch(errorRollback){console.error("No se pudo anular PROCEDIMIENTO sin transición confirmada",errorRollback);}
      }
      throw cambioError||Error("El operativo cambió desde otro dispositivo; reintentá PROCEDIMIENTO.");
    }
  }

  if(acople){
    const fechaCambio=new Date().toISOString();
    const anterior=estadoAnterior.datos||{};
    const historial=Array.isArray(anterior.movimientos_recursos)?anterior.movimientos_recursos:[];
    const cambio={
      ...acople,fecha_evento:limpio.fecha_evento,
      texto:limpio.texto_salida,informe_id:informe.id,
      informe_key:limpio.informe_key,
      origen:"CONTROL_SUPERIOR"
    };
    const datos={
      ...anterior,recursos_vigentes:acople.vigente,
      movimientos_recursos:[...historial,cambio]
    };
    let query=obtenerSupabaseClient().from(TABLAS_SUPABASE.operativosEstado)
      .update({datos,updated_at:fechaCambio})
      .eq("id",estadoAnterior.id).eq("estado","EN_CURSO");
    if(estadoAnterior.updated_at)query=query.eq("updated_at",estadoAnterior.updated_at);
    const {data:confirmacion,error:cambioError}=await query.select("id").maybeSingle();
    if(cambioError||!confirmacion){
      // No dejar un control sin ACOPLE confirmado como si fuera exitoso.
      if(!informeExistente){
        try{await obtenerSupabaseClient().from(TABLAS_SUPABASE.informesIntradiarios)
          .update({activo:false}).eq("id",informe.id).eq("informe_key",limpio.informe_key);}
        catch(errorRollback){console.error("No se pudo anular el control sin acople",errorRollback);}
      }
      throw cambioError||Error("La dotación cambió en otro dispositivo. Reintentá CONTROL SUPERIOR.");
    }
  }

  return {
    ...crearResultadoSupabaseOk({
      informe,
      items: resultadoItems?.data || []
    }),
    mensaje: "Informe guardado en Supabase V2."
  };
}

// Transformación pura: admite más de un PROCEDIMIENTO por operativo, conserva
// los recursos vigentes e inicio_snapshot y no produce evento FINALIZADO.
export function construirTransicionProcedimiento(estado, payload, informe){
  const anterior=estado?.datos||{};
  const previos=Array.isArray(anterior.procedimientos_eventos)
    ? anterior.procedimientos_eventos:[];
  const evento={informe_key:payload.informe_key,informe_id:informe.id,
    fecha_evento:payload.fecha_evento,hecho:String(payload.datos?.hecho||""),
    texto:payload.texto_salida,lugar:payload.lugar};
  const repetido=previos.some(e=>e.informe_key===payload.informe_key);
  const eventos=repetido
    ? previos.map(e=>e.informe_key===payload.informe_key?evento:e)
    : [...previos,evento];
  return {
    estado:"EN_PROCEDIMIENTO",tipo_evento:"PROCEDIMIENTO",
    datos:{...anterior,procedimientos_eventos:eventos},
    updated_at:new Date().toISOString()
  };
}

export async function listarInformesEspecialesV2({
  guardia_fecha,
  operativo_key,
  tipo_informe,
  limite = 50
} = {}) {
  return listarInformesIntradiariosV2({
    guardia_fecha,
    operativo_key,
    tipo_informe: tipo_informe ? normalizarModelo(tipo_informe) : undefined,
    activo: true,
    limite
  });
}

function limpiarPayloadInformeEspecial(payload = {}) {
  const fechaEvento = normalizarFechaEvento(payload.fecha_evento || payload.fecha || new Date().toISOString());

  return limpiarObjeto({
    informe_key: String(payload.informe_key || "").trim(),
    guardia_fecha: normalizarFechaISO(payload.guardia_fecha),
    fecha_informe: normalizarFechaISO(payload.fecha_informe),
    hora_informe: normalizarHora(payload.hora_informe),
    operativo_key: String(payload.operativo_key || "").trim(),
    tipo_informe: normalizarModelo(payload.tipo_informe || payload.modelo || ""),
    tipo_operativo: normalizarTipo(payload.tipo_operativo || "GENERICO"),
    hora_inicio: String(payload.hora_inicio || "").trim(),
    hora_fin: String(payload.hora_fin || "").trim(),
    lugar: String(payload.lugar || "").trim(),
    foto_prefijo: String(payload.foto_prefijo || "").trim(),
    datos: esObjeto(payload.datos) ? payload.datos : {},
    calculos: esObjeto(payload.calculos) ? payload.calculos : {},
    texto_salida: String(payload.texto_salida || "").trim(),
    origen: String(payload.origen || "Informes_GP").trim() || "Informes_GP",
    activo: payload.activo !== false,
    fecha_evento: fechaEvento
  });
}

function validarInformeEspecial(payload) {
  if (!payload.guardia_fecha) {
    throw new Error("No se puede guardar informe especial: falta guardia_fecha.");
  }

  if (!payload.operativo_key) {
    throw new Error("No se puede guardar informe especial: falta operativo_key.");
  }

  if (!payload.tipo_informe) {
    throw new Error("No se puede guardar informe especial: falta tipo_informe.");
  }

  if (!payload.informe_key) {
    throw new Error("No se puede guardar informe especial: falta informe_key.");
  }

  if (!payload.texto_salida) {
    throw new Error("No se puede guardar informe especial: falta texto_salida.");
  }
}

function construirItemsInformeEspecial({ informe, payload }) {
  const items = [];
  let orden = 0;

  const base = {
    informe_id: informe.id,
    guardia_fecha: informe.guardia_fecha,
    operativo_key: informe.operativo_key,
    tipo_informe: informe.tipo_informe
  };

  // Siempre deja una marca estructurada del tipo de informe. STATS puede
  // consumirla sin interpretar el texto de WhatsApp.
  items.push({
    ...base,
    tipo_item: "INFORME",
    codigo: normalizarCodigo(informe.tipo_informe),
    cantidad: 1,
    detalle: `INFORME ${String(informe.tipo_informe || "").replaceAll("_", " ")}`,
    datos: {},
    orden: orden++
  });

  const numerales = obtenerArrayPreferido(
    payload?.datos?.numerales_sugeridos,
    payload?.calculos?.numerales_sugeridos
  );

  for (const numeral of numerales) {
    const codigo = String(numeral?.codigo || "").trim();
    const cantidad = numeroNoNegativo(numeral?.cantidad, 1);
    if (!codigo || cantidad <= 0) continue;

    items.push({
      ...base,
      tipo_item: "NUMERAL",
      codigo,
      cantidad,
      detalle: String(numeral?.detalle || "").trim() || null,
      datos: limpiarObjeto({
        categoria: numeral?.categoria || "SUGERIDO"
      }),
      orden: orden++
    });
  }

  const incrementos = obtenerObjetoPreferido(
    payload?.datos?.incrementos_sugeridos,
    payload?.calculos?.incrementos_sugeridos
  );

  for (const [codigoRaw, cantidadRaw] of Object.entries(incrementos)) {
    const cantidad = numeroNoNegativo(cantidadRaw, 0);
    if (cantidad <= 0) continue;

    items.push({
      ...base,
      tipo_item: "RESULTADO",
      codigo: normalizarCodigo(codigoRaw),
      cantidad,
      detalle: null,
      datos: {},
      orden: orden++
    });
  }

  return consolidarItems(items);
}

function consolidarItems(items = []) {
  const salida = [];
  const mapa = new Map();

  for (const item of items) {
    const clave = `${item.tipo_item}|${item.codigo}|${item.detalle || ""}`;

    if (!mapa.has(clave)) {
      const copia = { ...item, orden: salida.length };
      mapa.set(clave, copia);
      salida.push(copia);
      continue;
    }

    const existente = mapa.get(clave);
    existente.cantidad = Number(existente.cantidad || 0) + Number(item.cantidad || 0);
  }

  return salida;
}

function obtenerArrayPreferido(...candidatos) {
  for (const valor of candidatos) {
    if (Array.isArray(valor)) return valor;
  }
  return [];
}

function obtenerObjetoPreferido(...candidatos) {
  for (const valor of candidatos) {
    if (esObjeto(valor)) return valor;
  }
  return {};
}

function numeroNoNegativo(valor, fallback = 0) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, n);
}

function normalizarModelo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_")
    .replace("DECTO_460_22", "DECRETO_460_22");
}

function normalizarTipo(valor) {
  return String(valor || "GENERICO")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

function normalizarCodigo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9/._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizarFechaISO(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";

  let m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;

  return "";
}

function normalizarHora(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";
  const m = texto.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!m) return "";

  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return "";
  return `${pad2(hh)}:${pad2(mm)}`;
}

function normalizarFechaEvento(valor) {
  const fecha = new Date(valor || Date.now());
  if (Number.isNaN(fecha.getTime())) return new Date().toISOString();
  return fecha.toISOString();
}

function pad2(valor) {
  return String(valor).padStart(2, "0");
}

function esObjeto(valor) {
  return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
}

function limpiarObjeto(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, valor]) => valor !== undefined)
  );
}
