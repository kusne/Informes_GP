(function () {
  "use strict";

  window.WSP = window.WSP || {};
  window.WSP.ui = window.WSP.ui || {};
  window.WSP.modules = window.WSP.modules || {};

  function instalarAjusteVisualAyudaControlMoviles() {
    const id = "informesgp-control-moviles-ayuda-posicion";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      #controlMovilesAyudaWrap.control-moviles-ayuda-wrap {
        top: -132px !important;
      }

      @media (max-width: 430px) {
        #controlMovilesAyudaWrap.control-moviles-ayuda-wrap {
          top: -132px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  instalarAjusteVisualAyudaControlMoviles();

  function activarControlMoviles(config = {}) {
    instalarAjusteVisualAyudaControlMoviles();

    if (typeof config.desactivarPantallasInformes === "function") {
      config.desactivarPantallasInformes();
    }

    if (typeof config.setTituloOperativosIniciados === "function") {
      config.setTituloOperativosIniciados(false);
    }

    if (typeof config.cargarOperativosDisponibles === "function") {
      config.cargarOperativosDisponibles(config.valorSeleccionado || "");
    }

    if (typeof config.actualizarDatosFranja === "function") {
      config.actualizarDatosFranja();
    }

    if (typeof config.setUIControlMovilesActiva === "function") {
      config.setUIControlMovilesActiva(true);
    }

    if (typeof config.sincronizarUIAlcoholimetro === "function") {
      config.sincronizarUIAlcoholimetro();
    }

    if (typeof config.sincronizarUIQrzDominio === "function") {
      config.sincronizarUIQrzDominio();
    }

    return { ok: true, modo: "CONTROL_MOVILES" };
  }

  const api = {
    activarControlMoviles,
  };

  window.WSP.ui.controlMovilesFlujo = api;
  window.WSP.modules.controlMovilesFlujoUi = api;
})();
