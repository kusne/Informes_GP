import {
  supabase,
  supabaseDisponible
} from "./supabase-client.js";
import {
  resolverPrefijoFotoPorModoPayload,
  obtenerFotosPorPrefijo
} from "../../aplicacion/estado/fotos-estado.js";

const BUCKET_FOTOS = "operativos-historial-fotos";

export async function subirFotosAdjuntasSupabase({
  modo,
  payload
} = {}) {
  const modoNormalizado = normalizarModo(modo);

  if (!payload) {
    return {
      payload,
      fotos: [],
      saltado: true,
      motivo: "Sin payload."
    };
  }

  const prefijo = resolverPrefijoFotoPorModoPayload({
    modo: modoNormalizado,
    payload
  });

  if (!prefijo) {
    return {
      payload,
      fotos: [],
      saltado: true,
      motivo: "Modo sin fotos adjuntas."
    };
  }

  const fotos = obtenerFotosPorPrefijo(prefijo)
    .filter((foto) => foto && (foto.archivo || foto.archivoOriginal));

  if (!fotos.length) {
    return {
      payload: agregarFotosPayload(payload, []),
      fotos: [],
      saltado: true,
      motivo: "Sin fotos cargadas."
    };
  }

  if (!supabaseDisponible() || !supabase) {
    console.warn("[Informes_GP] Supabase no disponible. Las fotos quedan solo en memoria.");
    return {
      payload: agregarFotosPayload(payload, normalizarFotosSinSubir(fotos, prefijo, modoNormalizado)),
      fotos: normalizarFotosSinSubir(fotos, prefijo, modoNormalizado),
      saltado: true,
      motivo: "Supabase no disponible."
    };
  }

  const contextoRuta = construirContextoRuta({
    modo: modoNormalizado,
    payload,
    prefijo
  });

  const fotosSubidas = [];

  for (const foto of fotos) {
    const subida = await subirFotoIndividual({
      foto,
      contextoRuta
    });

    fotosSubidas.push(subida);
  }

  return {
    payload: agregarFotosPayload(payload, fotosSubidas),
    fotos: fotosSubidas,
    saltado: false,
    motivo: "Fotos subidas."
  };
}

async function subirFotoIndividual({
  foto,
  contextoRuta
}) {
  const archivo = foto.archivo || foto.archivoOriginal;

  if (!archivo) {
    throw new Error(`La foto ${foto.nombre || foto.indice || ""} no tiene archivo disponible para subir.`);
  }

  const nombre = limpiarNombreArchivo(foto.nombre || archivo.name || `foto_${foto.indice || 1}.jpg`);

  const path = [
    contextoRuta.guardia_fecha,
    contextoRuta.operativo_key,
    contextoRuta.modo,
    contextoRuta.prefijo,
    nombre
  ]
    .map(limpiarSegmentoPath)
    .filter(Boolean)
    .join("/");

  const { data, error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .upload(path, archivo, {
      upsert: true,
      contentType: archivo.type || "image/jpeg",
      cacheControl: "3600"
    });

  if (error) {
    throw new Error(`No se pudo subir foto ${nombre}: ${error.message || error}`);
  }

  const publicUrlResponse = supabase.storage
    .from(BUCKET_FOTOS)
    .getPublicUrl(path);

  const urlPublica =
    publicUrlResponse?.data?.publicUrl ||
    publicUrlResponse?.publicURL ||
    "";

  return {
    indice: foto.indice || null,
    nombre,
    bucket: BUCKET_FOTOS,
    path: data?.path || path,
    url_publica: urlPublica,
    prefijo: contextoRuta.prefijo,
    modo: contextoRuta.modo
  };
}

function agregarFotosPayload(payload, fotosSubidas = []) {
  const limpio = fotosSubidas.map((foto) => ({
    indice: foto.indice,
    nombre: foto.nombre,
    bucket: foto.bucket || BUCKET_FOTOS,
    path: foto.path || "",
    url_publica: foto.url_publica || "",
    prefijo: foto.prefijo || "",
    modo: foto.modo || ""
  }));

  const datos = {
    ...(payload.datos || {}),
    fotos: limpio
  };

  return {
    ...payload,
    datos,
    fotos_adjuntas: limpio
  };
}

function normalizarFotosSinSubir(fotos = [], prefijo = "", modo = "") {
  return fotos.map((foto) => ({
    indice: foto.indice || null,
    nombre: foto.nombre || "",
    bucket: "",
    path: "",
    url_publica: "",
    prefijo,
    modo
  }));
}

function construirContextoRuta({
  modo,
  payload,
  prefijo
}) {
  return {
    modo: limpiarSegmentoPath(modo || "sin_modo"),
    guardia_fecha: limpiarSegmentoPath(payload?.guardia_fecha || "sin_guardia"),
    operativo_key: limpiarSegmentoPath(payload?.operativo_key || "sin_operativo"),
    prefijo: limpiarSegmentoPath(prefijo || "fotos")
  };
}

function normalizarModo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

function limpiarSegmentoPath(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function limpiarNombreArchivo(valor) {
  const nombre = limpiarSegmentoPath(valor || "foto.jpg");

  if (nombre.includes(".")) return nombre;

  return `${nombre}.jpg`;
}