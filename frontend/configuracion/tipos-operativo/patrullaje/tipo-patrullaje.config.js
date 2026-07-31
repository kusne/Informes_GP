export const TIPO_PATRULLAJE_CONFIG = {
  key: "PATRULLAJE",
  slug: "patrullaje",
  nombre: "PATRULLAJE",

  rutas: {
    inicia: {
      html: "/frontend/pantallas/inicia/tipos/patrullaje/inicio-patrullaje.html",
      js: "/frontend/pantallas/inicia/tipos/patrullaje/inicio-patrullaje.js",
      css: "/frontend/pantallas/inicia/tipos/patrullaje/inicio-patrullaje.css",
      fotos: {
        html: "/frontend/pantallas/inicia/tipos/patrullaje/fotos/fotos-inicio-patrullaje.html",
        js: "/frontend/pantallas/inicia/tipos/patrullaje/fotos/fotos-inicio-patrullaje.js",
        css: "/frontend/pantallas/inicia/tipos/patrullaje/fotos/fotos-inicio-patrullaje.css"
      }
    },

    finaliza: {
      html: "/frontend/pantallas/finaliza/tipos/patrullaje/finaliza-patrullaje.html",
      js: "/frontend/pantallas/finaliza/tipos/patrullaje/finaliza-patrullaje.js",
      css: "/frontend/pantallas/finaliza/tipos/patrullaje/finaliza-patrullaje.css",
      fotos: {
        html: "/frontend/pantallas/finaliza/tipos/patrullaje/fotos/fotos-finaliza-patrullaje.html",
        js: "/frontend/pantallas/finaliza/tipos/patrullaje/fotos/fotos-finaliza-patrullaje.js",
        css: "/frontend/pantallas/finaliza/tipos/patrullaje/fotos/fotos-finaliza-patrullaje.css"
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


