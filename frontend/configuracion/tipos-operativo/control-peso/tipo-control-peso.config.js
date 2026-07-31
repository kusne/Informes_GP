export const TIPO_CONTROL_PESO_CONFIG = {
  key: "CONTROL_PESO",
  slug: "control-peso",
  nombre: "CONTROL DE PESO",

  rutas: {
    inicia: {
      html: "/frontend/pantallas/inicia/tipos/control-peso/inicio-control-peso.html",
      js: "/frontend/pantallas/inicia/tipos/control-peso/inicio-control-peso.js",
      css: "/frontend/pantallas/inicia/tipos/control-peso/inicio-control-peso.css",
      fotos: {
        html: "/frontend/pantallas/inicia/tipos/control-peso/fotos/fotos-inicio-control-peso.html",
        js: "/frontend/pantallas/inicia/tipos/control-peso/fotos/fotos-inicio-control-peso.js",
        css: "/frontend/pantallas/inicia/tipos/control-peso/fotos/fotos-inicio-control-peso.css"
      }
    },

    finaliza: {
      html: "/frontend/pantallas/finaliza/tipos/control-peso/finaliza-control-peso.html",
      js: "/frontend/pantallas/finaliza/tipos/control-peso/finaliza-control-peso.js",
      css: "/frontend/pantallas/finaliza/tipos/control-peso/finaliza-control-peso.css",
      fotos: {
        html: "/frontend/pantallas/finaliza/tipos/control-peso/fotos/fotos-finaliza-control-peso.html",
        js: "/frontend/pantallas/finaliza/tipos/control-peso/fotos/fotos-finaliza-control-peso.js",
        css: "/frontend/pantallas/finaliza/tipos/control-peso/fotos/fotos-finaliza-control-peso.css"
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


