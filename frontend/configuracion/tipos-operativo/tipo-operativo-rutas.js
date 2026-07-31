import { obtenerTipoOperativoRegistrado } from "./tipos-operativo-registro.js";

export function obtenerRutasFormularioOperativo({ modo, operativo, tipo_operativo } = {}) {
  const modoNormalizado = String(modo || "").trim().toUpperCase();
  const tipo = obtenerTipoOperativoRegistrado(
    tipo_operativo || operativo?.tipo_operativo || operativo?.tipo || operativo?.tipo_nombre
  );

  if (modoNormalizado === "INICIA") {
    return {
      html: tipo.rutas.inicia.html,
      modulo: "/frontend/pantallas/inicia/inicia.js",
      iniciarExport: "iniciarFormularioInicia"
    };
  }

  if (modoNormalizado === "FINALIZA") {
    return {
      html: tipo.rutas.finaliza.html,
      modulo: "/frontend/pantallas/finaliza/finaliza.js",
      iniciarExport: "iniciarFormularioFinaliza"
    };
  }

  throw new Error(`Modo de formulario no soportado: ${modoNormalizado || "SIN MODO"}`);
}
