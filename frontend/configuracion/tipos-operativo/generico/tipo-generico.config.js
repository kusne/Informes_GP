export const TIPO_GENERICO_CONFIG = {
  key: "GENERICO",
  slug: "generico",
  nombre: "GENÉRICO",

  rutas: {
    inicia: {
      html: "/frontend/pantallas/inicia/tipos/generico/inicio-generico.html",
      js: "/frontend/pantallas/inicia/tipos/generico/inicio-generico.js",
      css: "/frontend/pantallas/inicia/tipos/generico/inicio-generico.css",
      fotos: {
        html: "/frontend/pantallas/inicia/tipos/generico/fotos/fotos-inicio-generico.html",
        js: "/frontend/pantallas/inicia/tipos/generico/fotos/fotos-inicio-generico.js",
        css: "/frontend/pantallas/inicia/tipos/generico/fotos/fotos-inicio-generico.css"
      }
    },

    finaliza: {
      html: "/frontend/pantallas/finaliza/tipos/generico/finaliza-generico.html",
      js: "/frontend/pantallas/finaliza/tipos/generico/finaliza-generico.js",
      css: "/frontend/pantallas/finaliza/tipos/generico/finaliza-generico.css",
      fotos: {
        html: "/frontend/pantallas/finaliza/tipos/generico/fotos/fotos-finaliza-generico.html",
        js: "/frontend/pantallas/finaliza/tipos/generico/fotos/fotos-finaliza-generico.js",
        css: "/frontend/pantallas/finaliza/tipos/generico/fotos/fotos-finaliza-generico.css"
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


