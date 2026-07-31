export const TIPO_OCV_DICEP_CONFIG = {
  key: "OCV_DICEP",
  slug: "ocv-dicep",
  nombre: "OCV + DICEP",

  rutas: {
    inicia: {
      html: "/frontend/pantallas/inicia/tipos/ocv-dicep/inicio-ocv-dicep.html",
      js: "/frontend/pantallas/inicia/tipos/ocv-dicep/inicio-ocv-dicep.js",
      css: "/frontend/pantallas/inicia/tipos/ocv-dicep/inicio-ocv-dicep.css",
      fotos: {
        html: "/frontend/pantallas/inicia/tipos/ocv-dicep/fotos/fotos-inicio-ocv-dicep.html",
        js: "/frontend/pantallas/inicia/tipos/ocv-dicep/fotos/fotos-inicio-ocv-dicep.js",
        css: "/frontend/pantallas/inicia/tipos/ocv-dicep/fotos/fotos-inicio-ocv-dicep.css"
      }
    },

    finaliza: {
      html: "/frontend/pantallas/finaliza/tipos/ocv-dicep/finaliza-ocv-dicep.html",
      js: "/frontend/pantallas/finaliza/tipos/ocv-dicep/finaliza-ocv-dicep.js",
      css: "/frontend/pantallas/finaliza/tipos/ocv-dicep/finaliza-ocv-dicep.css",
      fotos: {
        html: "/frontend/pantallas/finaliza/tipos/ocv-dicep/fotos/fotos-finaliza-ocv-dicep.html",
        js: "/frontend/pantallas/finaliza/tipos/ocv-dicep/fotos/fotos-finaliza-ocv-dicep.js",
        css: "/frontend/pantallas/finaliza/tipos/ocv-dicep/fotos/fotos-finaliza-ocv-dicep.css"
      }
    }
  },

  reglas: {
    requiereOperativoSeleccionado: true,
    permiteFotosInicio: true,
    permiteFotosFinaliza: true,
    permiteInformesEspeciales: true
  }
};


