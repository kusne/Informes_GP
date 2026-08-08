import { registrarFotosModulo } from "../../../../../api/app-api.js";
import { validarFotoArchivo, validarCantidadFotos } from "../../../../../api/app-api.js";
import { normalizarNombreFoto } from "../../../../../api/app-api.js";
import { comprimirFotoBasica } from "../../../../servicios/fotos/comprimir-foto.js";

const estadoFotos = { prefijo: "finaliza-unificado", fotos: [] };

export async function iniciarModuloFotos({ root = document, contexto = {} } = {}) {
  const modulo = root.querySelector(`[data-prefijo-foto="${estadoFotos.prefijo}"]`);
  if (!modulo) { publicarEstadoFotos(); return obtenerEstadoFotos(); }

  limpiarUrlsTemporales();
  estadoFotos.fotos = [];

  for (const input of modulo.querySelectorAll("[data-foto-input]")) {
    input.addEventListener("change", async () => {
      const indice = Number(input.dataset.fotoInput || 0);
      await procesarFoto({ modulo, indice, archivo: input.files?.[0] || null, contexto });
      input.value = "";
    });
  }

  for (const boton of modulo.querySelectorAll("[data-galeria-btn]")) {
    boton.addEventListener("click", () => abrirGaleria({ modulo, boton, contexto }));
  }

  publicarEstadoFotos();
  return obtenerEstadoFotos();
}

export function obtenerFotosModulo() {
  return estadoFotos.fotos.map((foto) => ({ indice: foto.indice, nombre: foto.nombre, archivo: foto.archivo, archivoOriginal: foto.archivoOriginal, urlTemporal: foto.urlTemporal || null }));
}
export function limpiarFotosModulo() { limpiarUrlsTemporales(); estadoFotos.fotos = []; publicarEstadoFotos(); return obtenerFotosModulo(); }
function obtenerEstadoFotos() { return { prefijo: estadoFotos.prefijo, fotos: obtenerFotosModulo() }; }

function abrirGaleria({ modulo, boton, contexto }) {
  const indice = Number(boton.dataset.galeriaBtn || 0); if (!indice) return;
  const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.style.display = "none";
  input.addEventListener("change", async () => { await procesarFoto({ modulo, indice, archivo: input.files?.[0] || null, contexto }); input.remove(); });
  modulo.appendChild(input); input.click();
}

async function procesarFoto({ modulo, indice, archivo, contexto }) {
  if (!archivo || !indice) return;
  try {
    const otras = estadoFotos.fotos.filter((foto) => foto.indice !== indice);
    validarCantidadFotos(otras, 4); validarFotoArchivo(archivo);
    const nombre = normalizarNombreFoto({ archivo, prefijo: estadoFotos.prefijo, indice, contexto });
    const archivoComprimido = await comprimirFotoBasica(archivo, { nombre });
    const anterior = estadoFotos.fotos.find((foto) => foto.indice === indice);
    if (anterior?.urlTemporal) { try { URL.revokeObjectURL(anterior.urlTemporal); } catch {} }
    const registro = { indice, nombre, archivo: archivoComprimido, archivoOriginal: archivo, urlTemporal: URL.createObjectURL(archivoComprimido) };
    estadoFotos.fotos = estadoFotos.fotos.filter((foto) => foto.indice !== indice);
    estadoFotos.fotos.push(registro); estadoFotos.fotos.sort((a,b) => a.indice-b.indice);
    const estado = modulo.querySelector(`[data-foto-estado="${indice}"]`);
    if (estado) { estado.textContent = nombre; estado.classList.add("foto-cargada"); }
    publicarEstadoFotos();
    modulo.closest(".formulario-finaliza")?.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) { console.error("[Informes_GP] Error cargando foto de FINALIZA:", error); alert(error?.message || "No se pudo cargar la foto."); }
}

function publicarEstadoFotos() {
  const resumen = obtenerFotosModulo();
  registrarFotosModulo(estadoFotos.prefijo, resumen);
}
function limpiarUrlsTemporales() { for (const foto of estadoFotos.fotos) if (foto?.urlTemporal) { try { URL.revokeObjectURL(foto.urlTemporal); } catch {} } }
