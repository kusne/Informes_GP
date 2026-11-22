import { obtenerEstadoOperativoV2, guardarRevisionInicioOperativoV2 } from "../../../api/persistencia-api.js";
import { prepararRevisionInicioOperativo, obtenerDatosInicioParaRevision } from "../../../api/revision-inicio-api.js";
import { modoEnsayoActivo } from "../../../api/app-api.js";
import {
  prepararVentanaWhatsapp, cerrarVentanaWhatsappPreparada, abrirWhatsappConTexto
} from "../../servicios/whatsapp/abrir-whatsapp.js";

const texto = value => String(value ?? "").trim();
const escapar = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;")
  .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

export async function iniciarRevisionInicio({host,operativoSeleccionado,esSeleccionVigente} = {}) {
  if (!host || !operativoSeleccionado?.operativo_key) return;
  if (modoEnsayoActivo()) throw Error("La rectificación de INICIO requiere un operativo real de Supabase; el modo ensayo no realiza modificaciones.");

  const registro = await obtenerEstadoOperativoV2({
    guardia_fecha:operativoSeleccionado.guardia_fecha,
    operativo_key:operativoSeleccionado.operativo_key
  });
  if (!host.isConnected || (typeof esSeleccionVigente === "function" && !esSeleccionVigente())) return;
  if (!registro || registro.estado !== "EN_CURSO")
    throw Error("El operativo seleccionado ya no está EN CURSO o no tiene un INICIO guardado.");
  const previos = obtenerDatosInicioParaRevision(registro);
  const formulario = previos.formulario;

  host.innerHTML = [
    '<section class="contenedor-dinamico-card inicio-revision-panel">',
    '<style>',
    '.inicio-revision-panel {color:#f8fafc !important;background:#29313b;border-radius:14px;padding:14px}',
    '.inicio-revision-panel h2,.inicio-revision-panel h3,.inicio-revision-panel p,.inicio-revision-panel small,.inicio-revision-panel strong {color:#fff !important}',
    '.inicio-revision-panel .ir-campo {display:grid;gap:6px;margin:12px 0}',
    '.inicio-revision-panel label {font-weight:800;color:#fff !important;font-size:16px}',
    '.inicio-revision-panel input[type=text],.inicio-revision-panel textarea {display:block;box-sizing:border-box;width:100%;min-width:0;min-height:48px;padding:11px 12px;border:2px solid #94a3b8;border-radius:10px;background:#fff !important;color:#111827 !important;font-size:17px;font-weight:600}',
    '.inicio-revision-panel textarea {min-height:75px}',
    '.inicio-revision-panel .ir-opciones {display:grid;gap:10px;margin:12px 0}',
    '.inicio-revision-panel .ir-opciones label {display:flex;align-items:center;gap:10px;color:#fff !important;line-height:1.3}',
    '.inicio-revision-panel .ir-opciones input {width:20px;height:20px}',
    '.inicio-revision-panel [data-dependencia-bloque] {border:1px solid #94a3b8;background:#26313d;border-radius:10px;padding:14px;margin:12px 0}',
    '.inicio-revision-panel .ir-linea {display:block;width:100%}',
    '.inicio-revision-panel .ir-linea .ir-campo {width:100%;margin:0 0 14px}',
    '.inicio-revision-panel button {min-height:44px;padding:10px 12px;margin:8px 0;border:0;border-radius:10px;background:#0b4a9d;color:#fff !important;font-weight:800}',
    '.inicio-revision-panel [data-vista-previa] {white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f5f9;color:#0f172a;border-radius:8px;padding:12px;max-height:360px;overflow:auto}',
    '.inicio-revision-panel [data-error] {color:#fff;font-weight:700}',
    '</style>',
    '<h2>Modificar un INICIO</h2>',
    '<p><strong>'+escapar(registro.tipo_nombre || registro.tipo_operativo)+'</strong></p>',
    '<p>'+escapar(registro.hora_inicio)+' A '+escapar(registro.hora_fin)+' — '+escapar(registro.lugar)+'</p>',
    '<div class="ir-opciones" role="group" aria-label="Acción para el inicio">',
    '<label><input type="radio" name="accion_revision_inicio" value="CORRECCION"> ¿Quiere corregir el INICIO?</label>',
    '<label><input type="radio" name="accion_revision_inicio" value="AMPLIACION"> ¿Quiere agregar otras dependencias u organismos?</label>',
    '</div>',
    '<div data-form-correccion hidden>',
    '<p>Datos del INICIO enviado, precargados para modificar.</p>',
    '<div class="ir-campo"><label for="ir-personal">Personal policial</label><textarea id="ir-personal" data-revision-campo="personal">'+escapar(formulario.personal)+'</textarea></div>',
    '<div class="ir-campo"><label for="ir-moviles">Móviles / motos</label><textarea id="ir-moviles" data-revision-campo="moviles_motos">'+escapar(formulario.moviles_motos)+'</textarea></div>',
    '<div class="ir-campo"><label for="ir-elementos">Elementos</label><textarea id="ir-elementos" data-revision-campo="elementos">'+escapar(formulario.elementos)+'</textarea></div>',
    '<div class="ir-campo"><label for="ir-observaciones">Observaciones</label><textarea id="ir-observaciones" data-revision-campo="observaciones">'+escapar(formulario.observaciones)+'</textarea></div>',
    previos.tieneMovimientos
      ? '<p role="status">Los movimientos posteriores (RELEVO, ACOPLE y RETIRO) permanecerán intactos. Esta rectificación no cambia la dotación vigente que ya fue modificada.</p>' : '',
    '</div>',
    '<div data-form-ampliacion hidden>',
    '<p>El personal nuevo se agrega al inicio hecho</p>',
    '<div data-dependencias-existentes></div><div data-dependencias-nuevas></div>',
    '<button type="button" data-agregar-dependencia>+ Agregar otra dependencia</button>',
    '</div>',
    '<div data-acciones hidden>',
    '<button type="button" data-revision-previa>Vista previa del informe</button>',
    '<pre data-vista-previa hidden aria-live="polite"></pre>',
    '<p data-error role="alert"></p>',
    '<button type="button" data-revision-enviar>Guardar y enviar por WhatsApp</button>',
    '<button type="button" data-reintentar-whatsapp hidden>Volver a abrir WhatsApp</button>',
    '</div></section>'
  ].join("");

  const area = host.querySelector(".inicio-revision-panel");
  const grupoCorreccion = area.querySelector("[data-form-correccion]");
  const grupoAmpliacion = area.querySelector("[data-form-ampliacion]");
  const acciones = area.querySelector("[data-acciones]");
  const error = area.querySelector("[data-error]");
  const vista = area.querySelector("[data-vista-previa]");
  const enviar = area.querySelector("[data-revision-enviar]");
  const reintentar = area.querySelector("[data-reintentar-whatsapp]");
  const containerDeps = area.querySelector("[data-dependencias-nuevas]");
  const existentes = area.querySelector("[data-dependencias-existentes]");
  let textoGuardado = "";
  let proximoId = 0;

  if (previos.dependencias.length) {
    const titulo = document.createElement("p");
    titulo.textContent = "Dependencias ya incorporadas al operativo:";
    existentes.append(titulo);
    for (const dep of previos.dependencias) {
      const resumen = document.createElement("p");
      resumen.textContent = dep.nombre + " — Móvil/es: " + (dep.moviles || "/") +
        " — Personal: " + (dep.personal || "/");
      existentes.append(resumen);
    }
  }

  function agregarDependencia() {
    const id = ++proximoId;
    const bloque = document.createElement("div");
    bloque.dataset.dependenciaBloque = String(id);
    bloque.innerHTML = [
      '<div class="ir-linea"><div class="ir-campo">',
      '<label>Dependencia u organismo</label><input type="text" data-dependencia-nombre placeholder="Ej.: UFIV - PAT" autocomplete="off">',
      '</div>',
      '</div>',
      '<div class="ir-campo"><label data-label-movil>¿Móvil/es de la dependencia?</label>',
      '<input type="text" data-dependencia-moviles placeholder="N.º 10139 / 10240"></div>',
      '<div class="ir-campo"><label data-label-personal>¿Personal de la dependencia?</label>',
      '<textarea data-dependencia-personal placeholder="Una persona por línea, con jerarquía y apellido"></textarea></div>'
    ].join("");
    containerDeps.append(bloque);
    const nombre = bloque.querySelector("[data-dependencia-nombre]");
    nombre.addEventListener("input", () => {
      const titulo = texto(nombre.value) || "la dependencia";
      bloque.querySelector("[data-label-movil]").textContent = "¿Móvil/es " + titulo + "?";
      bloque.querySelector("[data-label-personal]").textContent = "¿Personal " + titulo + "?";
    });
  }

  agregarDependencia();
  area.querySelector("[data-agregar-dependencia]").addEventListener("click", agregarDependencia);

  const accionActual = () => area.querySelector('[name="accion_revision_inicio"]:checked')?.value || "";
  const leer = () => ({
    operativo:registro,
    accion:accionActual(),
    formulario:Object.fromEntries(
      [...area.querySelectorAll("[data-revision-campo]")]
        .map(campo => [campo.dataset.revisionCampo, texto(campo.value)])
    ),
    dependencias:[...area.querySelectorAll("[data-dependencia-bloque]")]
      .map(bloque => ({
        nombre:texto(bloque.querySelector("[data-dependencia-nombre]").value),
        moviles:texto(bloque.querySelector("[data-dependencia-moviles]").value),
        personal:texto(bloque.querySelector("[data-dependencia-personal]").value)
      }))
      .filter(dep => dep.nombre || dep.moviles || dep.personal)
  });

  const limpiarVista = () => { vista.hidden = true; vista.textContent = ""; error.textContent = ""; };
  area.querySelectorAll('[name="accion_revision_inicio"]').forEach(opcion => {
    opcion.addEventListener("change", () => {
      grupoCorreccion.hidden = accionActual() !== "CORRECCION";
      grupoAmpliacion.hidden = accionActual() !== "AMPLIACION";
      acciones.hidden = !accionActual();
      limpiarVista();
    });
  });
  area.addEventListener("input", limpiarVista);

  function preparar() {
    const datos = leer();
    const revision = prepararRevisionInicioOperativo(datos);
    vista.textContent = revision.texto;
    vista.hidden = false;
    error.textContent = "";
    return {datos,revision};
  }

  area.querySelector("[data-revision-previa]").addEventListener("click", () => {
    try { preparar(); } catch(err) { error.textContent = err.message; }
  });
  reintentar.addEventListener("click", () => {
    if (textoGuardado) abrirWhatsappConTexto(textoGuardado);
  });
  enviar.addEventListener("click", async () => {
    if (enviar.disabled) return;
    let preparado;
    try { preparado = preparar(); }
    catch (err) { error.textContent = err.message; return; }

    const accion = preparado.datos.accion;
    if (!confirm(accion === "CORRECCION"
      ? "¿Confirmás el reenvío del INICIO RECTIFICADO?"
      : "¿Confirmás la AMPLIACIÓN DE INICIO con las dependencias agregadas?")) return;

    // Se abre durante el gesto del usuario para no perder la activación del navegador.
    const ventana = prepararVentanaWhatsapp();
    enviar.disabled = true;
    error.textContent = "Verificando y guardando el informe...";
    try {
      const guardado = await guardarRevisionInicioOperativoV2({
        guardia_fecha:registro.guardia_fecha,
        operativo_key:registro.operativo_key,
        expected_updated_at:registro.updated_at,
        accion, formulario:preparado.datos.formulario,
        dependencias:preparado.datos.dependencias
      });
      textoGuardado = guardado.texto;
      reintentar.hidden = false;
      error.textContent = "Modificación guardada en el mismo operativo. Abriendo WhatsApp...";
      window.dispatchEvent(new CustomEvent("informesgp:envio-whatsapp-ok", {
        detail:{modo:"INICIA",revision_inicio:accion,textoFinal:guardado.texto}
      }));
      abrirWhatsappConTexto(guardado.texto,{ventanaPreparada:ventana});
    } catch(err) {
      cerrarVentanaWhatsappPreparada(ventana);
      error.textContent = err?.message || "No se pudo guardar. El informe no fue enviado.";
      enviar.disabled = false;
    }
  });
}
