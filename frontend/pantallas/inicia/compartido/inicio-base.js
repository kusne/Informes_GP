export function leerFormularioInicio(root = document) {
  const form = root.querySelector(".formulario-inicia");
  if (!form) return null;

  const datos = {};

  const campos = form.querySelectorAll("input, textarea, select");

  for (const campo of campos) {
    if (campo.type === "file") {
      continue;
    }

    const nombre = campo.name || campo.id;
    if (!nombre) continue;

    if (campo.type === "checkbox") {
      datos[nombre] = Boolean(campo.checked);
      continue;
    }

    if (campo.type === "number") {
      datos[nombre] = normalizarNumero(campo.value);
      continue;
    }

    datos[nombre] = String(campo.value || "").trim();
  }

  datos.tipo_formulario = form.dataset.formulario || "";
  datos.tipo_operativo = form.dataset.tipoOperativo || "";
  datos.fotos_prefijo = datos.tipo_formulario || construirPrefijoFotos(datos.tipo_operativo);
  datos.fotos = obtenerResumenFotos(datos.fotos_prefijo);

  return datos;
}

export function normalizarNumero(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  return n;
}

export function observarCambiosInicio({ root = document, onChange }) {
  const form = root.querySelector(".formulario-inicia");
  if (!form) return () => {};

  const handler = () => {
    if (typeof onChange === "function") {
      onChange(leerFormularioInicio(root));
    }
  };

  form.addEventListener("input", handler);
  form.addEventListener("change", handler);

  handler();

  return () => {
    form.removeEventListener("input", handler);
    form.removeEventListener("change", handler);
  };
}

function construirPrefijoFotos(tipoOperativo) {
  const slug = String(tipoOperativo || "generico").trim().toLowerCase();
  return `inicio-${slug}`;
}

function obtenerResumenFotos(prefijo) {
  const fotos = window.InformesGP?.fotos?.[prefijo] || [];

  if (!Array.isArray(fotos)) {
    return [];
  }

  return fotos.map((foto) => ({
    indice: foto.indice,
    nombre: foto.nombre
  }));
}
