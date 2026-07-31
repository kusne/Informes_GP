export const TIPO_PRESENCIA_ACTIVA_CONFIG = {
  key: "PRESENCIA_ACTIVA",
  slug: "presencia-activa",
  nombre: "PRESENCIA ACTIVA",

  rutas: {
    inicia: {
      html: "/frontend/pantallas/inicia/tipos/presencia-activa/inicio-presencia-activa.html",
      js: "/frontend/pantallas/inicia/tipos/presencia-activa/inicio-presencia-activa.js",
      css: "/frontend/pantallas/inicia/tipos/presencia-activa/inicio-presencia-activa.css",
      fotos: {
        html: "/frontend/pantallas/inicia/tipos/presencia-activa/fotos/fotos-inicio-presencia-activa.html",
        js: "/frontend/pantallas/inicia/tipos/presencia-activa/fotos/fotos-inicio-presencia-activa.js",
        css: "/frontend/pantallas/inicia/tipos/presencia-activa/fotos/fotos-inicio-presencia-activa.css"
      }
    },

    finaliza: {
      html: "/frontend/pantallas/finaliza/tipos/presencia-activa/finaliza-presencia-activa.html",
      js: "/frontend/pantallas/finaliza/tipos/presencia-activa/finaliza-presencia-activa.js",
      css: "/frontend/pantallas/finaliza/tipos/presencia-activa/finaliza-presencia-activa.css",
      fotos: {
        html: "/frontend/pantallas/finaliza/tipos/presencia-activa/fotos/fotos-finaliza-presencia-activa.html",
        js: "/frontend/pantallas/finaliza/tipos/presencia-activa/fotos/fotos-finaliza-presencia-activa.js",
        css: "/frontend/pantallas/finaliza/tipos/presencia-activa/fotos/fotos-finaliza-presencia-activa.css"
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


