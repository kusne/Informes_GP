export const TIPO_OCV_CONFIG = {
  key: "OCV",
  slug: "ocv",
  nombre: "OCV",

  rutas: {
    inicia: {
      html: "/frontend/pantallas/inicia/tipos/ocv/inicio-ocv.html",
      js: "/frontend/pantallas/inicia/tipos/ocv/inicio-ocv.js",
      css: "/frontend/pantallas/inicia/tipos/ocv/inicio-ocv.css",
      fotos: {
        html: "/frontend/pantallas/inicia/tipos/ocv/fotos/fotos-inicio-ocv.html",
        js: "/frontend/pantallas/inicia/tipos/ocv/fotos/fotos-inicio-ocv.js",
        css: "/frontend/pantallas/inicia/tipos/ocv/fotos/fotos-inicio-ocv.css"
      }
    },

    finaliza: {
      html: "/frontend/pantallas/finaliza/tipos/ocv/finaliza-ocv.html",
      js: "/frontend/pantallas/finaliza/tipos/ocv/finaliza-ocv.js",
      css: "/frontend/pantallas/finaliza/tipos/ocv/finaliza-ocv.css",
      fotos: {
        html: "/frontend/pantallas/finaliza/tipos/ocv/fotos/fotos-finaliza-ocv.html",
        js: "/frontend/pantallas/finaliza/tipos/ocv/fotos/fotos-finaliza-ocv.js",
        css: "/frontend/pantallas/finaliza/tipos/ocv/fotos/fotos-finaliza-ocv.css"
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


