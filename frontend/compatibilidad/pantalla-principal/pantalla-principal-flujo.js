// Pantalla_Principal/pantalla-principal-flujo.js
(function () {
  "use strict";

  window.IGP = window.IGP || {};
  window.IGP.pantallaPrincipal = window.IGP.pantallaPrincipal || {};

  const VERSION = "pantalla-principal-flujo-20260806-informes-pagina-v4";

  const MODELOS_INFORMES = [
    {
      id: "control-superior",
      titulo: "Control Superior",
      descripcion: "Informe de control superior",
    },
    {
      id: "alcoholemia-positiva",
      titulo: "Alcoholemia Positiva",
      descripcion: "Informe de alcoholemia positiva",
    },
    {
      id: "decreto-460-22",
      titulo: "Decreto 460/22",
      descripcion: "Informe por procedimiento Decreto 460/22",
    },
    {
      id: "control-armas",
      titulo: "Control de Armas",
      descripcion: "Informe de control de armamento",
    },
    {
      id: "retencion-licencia",
      titulo: "Retención de Licencia",
      descripcion: "Informe de retención de licencia",
    },
  ];

  const ID_PANEL_MODELOS = "igp-panel-modelos-informes";
  const ID_CONTROL_MOUNT = "igp-control-moviles-mount";
  const ID_STYLE = "igp-pantalla-principal-flujo-style";
  const ID_HOST_PRINCIPAL = "pantallaPrincipalHost";
  const ID_HOST_DETALLE = "informeDetallePaginaHost";
  const LOGO_PATH = new URL("frontend/assets/logo-bmzcn-gold-black.png", document.baseURI).href;

  let modeloSeleccionado = null;
  let selectorPrincipal = null;
  let selectorOperativo = null;
  let contenedorOperativo = null;
  let placeholderOperativo = null;
  let aplicando = false;

  function normalizar(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function textoOValor(opcion) {
    return normalizar((opcion && (opcion.textContent || opcion.innerText)) || opcion?.value || "");
  }

  function obtenerValorSelect(select) {
    if (!select) return "";
    const opcion = select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
    return textoOValor(opcion) || normalizar(select.value);
  }

  function opcionesNormalizadas(select) {
    return Array.from(select?.options || []).map(textoOValor);
  }

  function esSelectorPrincipal(select) {
    const opciones = opcionesNormalizadas(select);
    return (
      opciones.includes("INICIA") &&
      opciones.includes("FINALIZA") &&
      (opciones.includes("INFORMES") || opciones.includes("CONTROL DE MOVILES") || opciones.includes("CONTROL DE MÓVILES"))
    );
  }

  function buscarSelectorPrincipal() {
    const exacto = Array.from(document.querySelectorAll("select")).find(esSelectorPrincipal);
    if (exacto) return exacto;

    return Array.from(document.querySelectorAll("select")).find((select) => {
      const opciones = opcionesNormalizadas(select).join("|");
      return opciones.includes("INICIA") || opciones.includes("FINALIZA") || opciones.includes("INFORMES");
    }) || null;
  }

  function asegurarOpcionesModo(select) {
    if (!select) return;

    const actuales = opcionesNormalizadas(select);

    const deseadas = [
      { value: "INICIA", label: "INICIA" },
      { value: "FINALIZA", label: "FINALIZA" },
      { value: "INFORMES", label: "INFORMES" },
      { value: "CONTROL_MOVILES", label: "CONTROL DE MÓVILES" },
    ];

    deseadas.forEach((item) => {
      const existe = Array.from(select.options || []).some((op) => normalizar(op.textContent || op.value) === normalizar(item.label));
      if (!existe) {
        const op = document.createElement("option");
        op.value = item.value;
        op.textContent = item.label;
        select.appendChild(op);
      }
    });

    select.dataset.igpSelectorPrincipal = "1";
  }

  function buscarSelectorOperativo() {
    const contextual = document.querySelector("#selectorOperativoContextualHost select");
    if (contextual && contextual !== selectorPrincipal) return contextual;
    return null;
  }

  function contenedorDe(elemento) {
    if (!elemento) return null;

    return elemento.closest(
      "[data-selector-operativo], .selector-operativo, .operativo-selector, .campo-selector, .form-group, .campo, .selector, .bloque-selector, .select-container, .control, .row, .grupo, .contenedor-selector"
    ) || elemento.parentElement;
  }

  function setVisible(elemento, visible) {
    if (!elemento) return;

    if (!elemento.dataset.igpDisplayOriginal) {
      elemento.dataset.igpDisplayOriginal = elemento.style.display || "";
    }

    elemento.style.display = visible ? elemento.dataset.igpDisplayOriginal : "none";
  }

  function asegurarEstilos() {
    if (document.getElementById(ID_STYLE)) return;

    const style = document.createElement("style");
    style.id = ID_STYLE;
    style.textContent = `
      #${ID_PANEL_MODELOS} {
        margin: 18px 0 22px;
        padding: 18px;
        border: 3px solid #0d4fa8;
        border-radius: 16px;
        background: #e9edf3;
        color: #07306b;
        box-shadow: 0 2px 9px rgba(0,0,0,.28);
      }

      #${ID_PANEL_MODELOS}[hidden] {
        display: none !important;
      }

      .igp-modelos-titulo {
        margin: 0 0 14px;
        font-size: 22px;
        font-weight: 900;
        color: #07306b;
      }

      .igp-modelos-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }

      .igp-modelo-btn {
        min-height: 76px;
        padding: 12px;
        border: 2px solid #9aa3b2;
        border-radius: 16px;
        background: #eef1f7;
        color: #090e1a;
        text-align: left;
        cursor: pointer;
        box-shadow: 0 3px 7px rgba(0,0,0,.16);
      }

      .igp-modelo-btn strong {
        display: block;
        margin-bottom: 5px;
        color: #07306b;
        font-size: 17px;
        font-weight: 900;
      }

      .igp-modelo-btn span {
        display: block;
        font-size: 13px;
        font-weight: 800;
        color: #2b3340;
        line-height: 1.25;
      }

      .igp-modelo-btn.activo {
        border-color: #0d4fa8;
        box-shadow: 0 0 0 3px rgba(13,79,168,.18);
      }

      .igp-modelo-seleccionado {
        margin-top: 14px;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(13,79,168,.10);
        color: #07306b;
        font-weight: 900;
      }

      .igp-slot-operativo-informe {
        margin-top: 14px;
      }

      #${ID_CONTROL_MOUNT}[hidden] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    if (!document.querySelector("link[data-igp-control-moviles-css='1']")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = new URL("frontend/compatibilidad/control-moviles/control-moviles.css?v=control-moviles-20260704", document.baseURI).href;
      link.dataset.igpControlMovilesCss = "1";
      document.head.appendChild(link);
    }
  }

  function crearPanelModelos() {
    let panel = document.getElementById(ID_PANEL_MODELOS);
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = ID_PANEL_MODELOS;
    panel.hidden = true;

    panel.innerHTML = `
      <h2 class="igp-modelos-titulo">Seleccione el modelo de informe</h2>
      <div class="igp-modelos-grid">
        ${MODELOS_INFORMES.map((modelo) => `
          <button type="button" class="igp-modelo-btn" data-modelo-informe="${modelo.id}">
            <strong>${modelo.titulo}</strong>
            <span>${modelo.descripcion}</span>
          </button>
        `).join("")}
      </div>
    `;

    const contenedorPrincipal = contenedorDe(selectorPrincipal);
    if (contenedorPrincipal && contenedorPrincipal.parentNode) {
      contenedorPrincipal.insertAdjacentElement("afterend", panel);
    } else if (selectorPrincipal?.parentNode) {
      selectorPrincipal.parentNode.insertBefore(panel, selectorPrincipal.nextSibling);
    } else {
      document.body.appendChild(panel);
    }

    return panel;
  }

  function crearMountControlMoviles() {
    let mount = document.getElementById(ID_CONTROL_MOUNT);
    if (mount) return mount;

    mount = document.createElement("div");
    mount.id = ID_CONTROL_MOUNT;
    mount.hidden = true;

    const panelModelos = document.getElementById(ID_PANEL_MODELOS);
    if (panelModelos && panelModelos.parentNode) {
      panelModelos.insertAdjacentElement("afterend", mount);
      return mount;
    }

    const contenedorPrincipal = contenedorDe(selectorPrincipal);
    if (contenedorPrincipal && contenedorPrincipal.parentNode) {
      contenedorPrincipal.insertAdjacentElement("afterend", mount);
    } else if (selectorPrincipal?.parentNode) {
      selectorPrincipal.parentNode.insertBefore(mount, selectorPrincipal.nextSibling);
    } else {
      document.body.appendChild(mount);
    }

    return mount;
  }

  function guardarUbicacionOperativo() {
    if (!contenedorOperativo || placeholderOperativo) return;
    placeholderOperativo = document.createComment("ubicacion-original-selector-operativo");
    contenedorOperativo.parentNode.insertBefore(placeholderOperativo, contenedorOperativo);
  }

  function moverOperativoAlPanelInformes(panel) {
    if (!panel || !contenedorOperativo) return;
    const slot = panel.querySelector("[data-slot-operativo-informe]");
    if (!slot) return;
    if (contenedorOperativo.parentNode !== slot) {
      slot.appendChild(contenedorOperativo);
    }
  }

  function devolverOperativo() {
    if (!placeholderOperativo || !placeholderOperativo.parentNode || !contenedorOperativo) return;
    if (contenedorOperativo.parentNode !== placeholderOperativo.parentNode) {
      placeholderOperativo.parentNode.insertBefore(contenedorOperativo, placeholderOperativo.nextSibling);
    }
  }

  function pintarModelo(panel) {
    panel.querySelectorAll("[data-modelo-informe]").forEach((btn) => {
      btn.classList.toggle("activo", btn.dataset.modeloInforme === modeloSeleccionado?.id);
    });
  }

  function aplicarLogo() {
    const imgs = Array.from(document.images || []);
    const candidato = imgs.find((img) => {
      const src = normalizar(img.getAttribute("src") || "");
      const alt = normalizar(img.getAttribute("alt") || "");
      const cls = normalizar(img.className || "");
      return src.includes("LOGO") || src.includes("BMZCN") || alt.includes("BMZCN") || alt.includes("LOGO") || cls.includes("LOGO");
    }) || imgs.find((img) => {
      const rect = img.getBoundingClientRect();
      return rect.width >= 55 && rect.height >= 55 && rect.top < 260;
    });

    if (candidato && !candidato.dataset.igpLogoGoldBlack) {
      candidato.src = LOGO_PATH;
      candidato.dataset.igpLogoGoldBlack = "1";
    }
  }

  function ocultarPanelViejoIncorrecto() {
    const viejo = document.getElementById("igp-panel-modelos-informes");
    if (viejo && viejo !== document.getElementById(ID_PANEL_MODELOS)) {
      viejo.hidden = true;
      viejo.style.display = "none";
    }
  }

  async function asegurarControlMovilesInicializado(mount) {
    if (!window.WSP?.modules?.controlMoviles?.init) return;
    if (mount.dataset.controlMovilesInit === "1") return;

    await window.WSP.modules.controlMoviles.init({ mount });
    mount.dataset.controlMovilesInit = "1";
  }

  function abrirSuperficieDetalleInforme() {
    const principal = document.getElementById(ID_HOST_PRINCIPAL);
    const detalle = document.getElementById(ID_HOST_DETALLE);
    const panel = document.getElementById(ID_PANEL_MODELOS);

    if (panel) panel.hidden = true;

    // Cambio físico de página en el mismo manejador que recibe el clic.
    if (principal) {
      principal.hidden = true;
      principal.setAttribute("aria-hidden", "true");
      principal.style.setProperty("display", "none", "important");
    }

    if (detalle) {
      detalle.hidden = false;
      detalle.removeAttribute("aria-hidden");
      detalle.style.setProperty("display", "block", "important");
    }

    document.body.classList.add("informe-detalle-activo");
    document.documentElement.classList.add("informe-detalle-activo");
    document.body.dataset.igpVista = "informe-detalle";
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function detalleInformeActivo() {
    return document.body.dataset.igpVista === "informe-detalle" ||
      document.body.classList.contains("informe-detalle-activo");
  }

  async function aplicarFlujo() {
    if (aplicando) return;
    aplicando = true;

    try {
      selectorPrincipal = buscarSelectorPrincipal();
      if (!selectorPrincipal) return;

      asegurarEstilos();
      aplicarLogo();
      asegurarOpcionesModo(selectorPrincipal);

      selectorOperativo = buscarSelectorOperativo();
      contenedorOperativo = contenedorDe(selectorOperativo);
      if (contenedorOperativo) guardarUbicacionOperativo();

      const panelModelos = crearPanelModelos();
      const mountControl = crearMountControlMoviles();

      const valor = obtenerValorSelect(selectorPrincipal);
      const esInformes = valor === "INFORMES";
      const esControlMoviles = valor === "CONTROL DE MOVILES" || valor === "CONTROL DE MÓVILES";

      ocultarPanelViejoIncorrecto();

      if (!esInformes) {
        modeloSeleccionado = null;
      }

      if (esInformes) {
        // Si un modelo está abierto como página propia, las tarjetas deben permanecer ocultas.
        panelModelos.hidden = detalleInformeActivo();
        mountControl.hidden = true;
        window.WSP?.modules?.controlMoviles?.setActiva?.(false);

        pintarModelo(panelModelos);

        // En INFORMES la selección se hace exclusivamente con las tarjetas.
        // El selector de operativo pertenece al formulario del modelo elegido.
        setVisible(contenedorOperativo, false);
      } else if (esControlMoviles) {
        panelModelos.hidden = true;
        mountControl.hidden = false;

        devolverOperativo();
        setVisible(contenedorOperativo, false);

        await asegurarControlMovilesInicializado(mountControl);
        window.WSP?.modules?.controlMoviles?.setActiva?.(true);
      } else {
        panelModelos.hidden = true;
        mountControl.hidden = true;

        window.WSP?.modules?.controlMoviles?.setActiva?.(false);

        devolverOperativo();
        setVisible(contenedorOperativo, true);
      }
    } finally {
      aplicando = false;
    }
  }

  function bind() {
    document.addEventListener("change", (event) => {
      if (event.target?.tagName === "SELECT") {
        aplicarFlujo();
      }
    });

    document.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-modelo-informe]");
      if (!btn) return;

      modeloSeleccionado = MODELOS_INFORMES.find((modelo) => modelo.id === btn.dataset.modeloInforme) || null;
      if (!modeloSeleccionado) return;

      // Primero cambia de página; después solicita el render del informe.
      abrirSuperficieDetalleInforme();

      document.dispatchEvent(new CustomEvent("igp:modelo-informe-seleccionado", {
        detail: modeloSeleccionado,
      }));

      aplicarFlujo();
    });

    document.addEventListener("igp:modelo-informe-limpiado", () => {
      modeloSeleccionado = null;
      const panel = document.getElementById(ID_PANEL_MODELOS);
      if (panel) pintarModelo(panel);
    });

    // La arquitectura actual ya controla sus renders. El observer global de
    // todo document.body provocaba escaneos repetidos mientras se montaban
    // personal, móviles y elementos. Se conserva la compatibilidad por eventos
    // de usuario sin vigilar cada mutación del DOM.
  }

  function iniciar() {
    bind();
    aplicarFlujo();
  }

  window.IGP.pantallaPrincipal.buscarSelectorPrincipal = buscarSelectorPrincipal;
  window.IGP.pantallaPrincipal.aplicarFlujo = aplicarFlujo;
  window.IGP.pantallaPrincipal.version = VERSION;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

  console.log("[Pantalla Principal] flujo cargado", VERSION);
})();
