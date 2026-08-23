import { cargarComponenteHtml } from "../../servicios/ui/cargar-componente-html.js";
import { resolverRutaApp } from "../../servicios/rutas/rutas-app.js";
import { obtenerOperativosPorModo } from "../../../api/app-api.js";
import {
  obtenerModeloInformeGP,
  normalizarModeloInforme
} from "./modelos-informes.js";
import { iniciarModeloInformeEspecial } from "./compartido/informe-especial-builder.js";

let estadoInforme = {
  modelo: null,
  operativoSeleccionado: null,
  operativos: []
};

export async function iniciarModuloInformes({
  hostSelector = "#informesModuloHost",
  modeloInformeSeleccionado = null,
  modeloInicial = "",
  getContexto
} = {}) {
  const host = document.querySelector(hostSelector);

  if (!host) return;

  const modeloKey = normalizarModeloInforme(
    modeloInformeSeleccionado?.modelo_key ||
    modeloInformeSeleccionado?.codigo ||
    modeloInicial
  );

  const modelo = obtenerModeloInformeGP(modeloKey);

  estadoInforme = {
    modelo,
    operativoSeleccionado: null,
    operativos: []
  };

  if (!modelo) {
    host.innerHTML = `
      <section class="pantalla-mensaje error-formulario">
        <h2>INFORMES</h2>
        <p>No se seleccionó un modelo de informe válido.</p>
      </section>
    `;
    return;
  }

  if (!host.querySelector("#informeOperativoSelectorHost")) {
    host.innerHTML = await cargarComponenteHtml("/frontend/pantallas/informes/informes.html");
  }

  await cargarOperativosInternos();
  renderSelectorOperativoInterno({
    host,
    getContexto
  });

  await renderFormularioInforme({
    host,
    getContexto
  });
}

export const iniciarInformes = iniciarModuloInformes;
export const iniciarInformesEspeciales = iniciarModuloInformes;

async function cargarOperativosInternos() {
  try {
    estadoInforme.operativos = await obtenerOperativosPorModo("INFORMES");
  } catch (error) {
    console.error("[Informes_GP] No se pudieron leer los últimos operativos iniciados para informe:", error);
    estadoInforme.operativos = [];
  }
}

function renderSelectorOperativoInterno({
  host,
  getContexto
}) {
  const contenedor = host.querySelector("#informeOperativoSelectorHost");

  if (!contenedor) return;

  const operativos = estadoInforme.operativos;

  contenedor.innerHTML = `
    <section class="informe-operativo-interno">
      <h3>${escapeHtml(estadoInforme.modelo?.nombre || "INFORME")}</h3>
      <label for="selectorOperativoDentroInforme">Últimos operativos iniciados</label>

      <select id="selectorOperativoDentroInforme" ${operativos.length ? "" : "disabled"}>
        <option value="">${operativos.length ? "Seleccionar uno de los últimos 2 operativos" : "No hay operativos iniciados disponibles"}</option>
        ${operativos.map((op) => `
          <option value="${escapeHtml(op.operativo_key)}">
            ${escapeHtml(construirEtiquetaOperativo(op))}
          </option>
        `).join("")}
      </select>

      <p class="informe-operativo-ayuda">
        ${operativos.length ? "Puede seleccionar un operativo aunque ya esté FINALIZADO." : "Todavía no hay operativos que hayan sido iniciados para vincular el informe."}
      </p>
    </section>
  `;

  const selector = contenedor.querySelector("#selectorOperativoDentroInforme");

  selector?.addEventListener("change", async () => {
    estadoInforme.operativoSeleccionado = operativos.find((op) => String(op.operativo_key) === selector.value) || null;

    await renderFormularioInforme({
      host,
      getContexto
    });
  });
}

async function renderFormularioInforme({
  host,
  getContexto
}) {
  const formHost = host.querySelector("#informeEspecialHost");

  if (!formHost) return;

  const modelo = estadoInforme.modelo;

  if (!modelo) {
    formHost.innerHTML = "";
    return;
  }

  try {
    formHost.innerHTML = await cargarComponenteHtml(modelo.html);
  } catch (error) {
    formHost.innerHTML = `
      <section class="pantalla-mensaje error-formulario">
        <h2>Error cargando ${escapeHtml(modelo.nombre)}</h2>
        <p>${escapeHtml(error?.message || String(error))}</p>
      </section>
    `;
    return;
  }

  const form =
    formHost.querySelector("form") ||
    formHost.querySelector("[data-modelo-informe]") ||
    formHost.firstElementChild;

  if (!form) {
    formHost.innerHTML = `
      <section class="pantalla-mensaje error-formulario">
        <h2>Error en informe</h2>
        <p>No se encontró formulario para ${escapeHtml(modelo.nombre)}.</p>
      </section>
    `;
    return;
  }

  if (modelo.modulo) {
    try {
      const moduloUI = await import(resolverRutaApp(modelo.modulo));
      if (typeof moduloUI.iniciarModeloInformeUI === "function") {
        await moduloUI.iniciarModeloInformeUI({
          form,
          operativoSeleccionado: estadoInforme.operativoSeleccionado,
          getContexto
        });
      }
    } catch (error) {
      console.error(`[Informes_GP] No se pudo iniciar UI de ${modelo.codigo}:`, error);
    }
  }

  await iniciarModeloInformeEspecial({
    form,
    modelo: modelo.codigo,
    operativoSeleccionado: estadoInforme.operativoSeleccionado,
    getContexto
  });
}

function construirEtiquetaOperativo(op = {}) {
  const horario = op.franja_horaria || construirFranja(op.hora_inicio, op.hora_fin) || "SIN HORARIO";
  const lugar = op.lugar || op.qth || op.ubicacion || "SIN LUGAR";
  const tipo = String(op.tipo_nombre || op.tipo_operativo || "OPERATIVO").replaceAll("_", " ");

  return `${horario} - ${lugar} - ${tipo}`;
}

function construirFranja(inicio, fin) {
  const i = String(inicio || "").trim();
  const f = String(fin || "").trim();

  if (i && f) return /FINALIZAR/i.test(f) ? `${i} A FINALIZAR` : `${i} A ${f} HS`;
  if (i) return `${i} HS`;

  return "";
}

function escapeHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
