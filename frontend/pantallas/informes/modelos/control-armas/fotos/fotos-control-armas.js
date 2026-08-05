import { registrarFotosModulo } from "../../../../../../backend/aplicacion/estado/informes-coordinador.js";
import { validarFotoArchivo, validarCantidadFotos } from "../../../../../../backend/dominio/compartido/fotos/validar-foto.js";
import { normalizarNombreFoto } from "../../../../../../backend/dominio/compartido/fotos/normalizar-nombre-foto.js";
import { comprimirFotoBasica } from "../../../../../servicios/fotos/comprimir-foto.js";

const estadoFotos = {
  prefijo: "control-armas",
  fotos: []
};

export async function iniciarModuloFotos({
  root = document,
  contexto = {}
} = {}) {
  const modulo = root.querySelector(`[data-prefijo-foto="${estadoFotos.prefijo}"]`);

  if (!modulo) {
    publicarEstadoFotos();
    return obtenerEstadoFotos();
  }

  const inputs = modulo.querySelectorAll("[data-foto-input]");

  for (const input of inputs) {
    input.addEventListener("change", async () => {
      const indice = Number(input.dataset.fotoInput || 0);
      const archivo = input.files?.[0] || null;

      await procesarFoto({
        modulo,
        indice,
        archivo,
        contexto
      });

      input.value = "";
    });
  }

  const botonesGaleria = modulo.querySelectorAll("[data-galeria-btn]");

  for (const boton of botonesGaleria) {
    boton.addEventListener("click", () => {
      const indice = Number(boton.dataset.galeriaBtn || 0);
      if (!indice) return;

      const inputGaleria = document.createElement("input");
      inputGaleria.type = "file";
      inputGaleria.accept = "image/*";
      inputGaleria.style.display = "none";

      inputGaleria.addEventListener("change", async () => {
        const archivo = inputGaleria.files?.[0] || null;

        await procesarFoto({
          modulo,
          indice,
          archivo,
          contexto
        });

        inputGaleria.remove();
      });

      modulo.appendChild(inputGaleria);
      inputGaleria.click();
    });
  }

  publicarEstadoFotos();
  return obtenerEstadoFotos();
}

export function obtenerFotosModulo() {
  return estadoFotos.fotos.map((foto) => ({
    indice: foto.indice,
    nombre: foto.nombre,
    archivo: foto.archivo,
    archivoOriginal: foto.archivoOriginal,
    urlTemporal: foto.urlTemporal || null
  }));
}

export function limpiarFotosModulo() {
  estadoFotos.fotos = [];
  publicarEstadoFotos();
  return obtenerEstadoFotos();
}

function obtenerEstadoFotos() {
  return {
    prefijo: estadoFotos.prefijo,
    fotos: obtenerFotosModulo()
  };
}

async function procesarFoto({
  modulo,
  indice,
  archivo,
  contexto
}) {
  if (!archivo || !indice) return;

  try {
    const fotosSinIndice = estadoFotos.fotos.filter((foto) => foto.indice !== indice);

    validarCantidadFotos(fotosSinIndice, 4);
    validarFotoArchivo(archivo);

    const nombre = normalizarNombreFoto({
      archivo,
      prefijo: estadoFotos.prefijo,
      indice,
      contexto
    });

    const archivoComprimido = await comprimirFotoBasica(archivo, {
      nombre
    });

    const registro = {
      indice,
      nombre,
      archivo: archivoComprimido,
      archivoOriginal: archivo,
      urlTemporal: URL.createObjectURL(archivoComprimido)
    };

    estadoFotos.fotos = estadoFotos.fotos.filter((foto) => foto.indice !== indice);
    estadoFotos.fotos.push(registro);
    estadoFotos.fotos.sort((a, b) => a.indice - b.indice);

    const estado = modulo.querySelector(`[data-foto-estado="${indice}"]`);

    if (estado) {
      estado.textContent = nombre;
      estado.classList.add("foto-cargada");
    }

    publicarEstadoFotos();
    dispararCambioFormulario(modulo);
  } catch (error) {
    console.error("[Informes_GP] Error cargando foto:", error);
    alert(error?.message || "No se pudo cargar la foto.");
  }
}

function publicarEstadoFotos() {
  const resumen = obtenerFotosModulo();

  registrarFotosModulo(estadoFotos.prefijo, resumen);

  window.InformesGP = window.InformesGP || {};
  window.InformesGP.fotos = window.InformesGP.fotos || {};
  window.InformesGP.fotos[estadoFotos.prefijo] = resumen;
}

function dispararCambioFormulario(modulo) {
  const form = modulo.closest(".formulario-inicia, .formulario-finaliza, .formulario-informe-especial");
  if (!form) return;

  form.dispatchEvent(new Event("change", {
    bubbles: true
  }));
}