import { modoEnsayoActivo, MOTIVOS_PRESENCIA_ACTIVA, obtenerDetallePresenciaActiva, prepararCambioPresenciaActiva, estaEnPresenciaActiva, horaReporteBuenosAires } from "../../../api/app-api.js";
import { obtenerEstadoOperativoV2, guardarCambioPresenciaActiva } from "../../../api/persistencia-api.js";
import { prepararVentanaWhatsapp, cerrarVentanaWhatsappPreparada, abrirWhatsappConTexto } from "../../servicios/whatsapp/abrir-whatsapp.js";

const escapar = valor => String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export async function iniciarFormularioPresenciaActiva({ host, operativoSeleccionado } = {}) {
  if (!host) return;
  const panel = document.createElement("section");
  panel.className = "pa-panel";
  host.replaceChildren(panel);

  const estilo = `
    <style>
      .pa-panel {background:#29313b;color:#f8fafc !important;padding:15px;border:1px solid #718096;border-radius:14px;}
      .pa-panel h2,.pa-panel h3,.pa-panel p,.pa-panel label,.pa-panel small,.pa-panel strong {color:#f8fafc !important;}
      .pa-panel h2 {font-size:23px;margin:0 0 10px;font-weight:900}
      .pa-panel p {line-height:1.35}
      .pa-panel .pa-campo {display:grid;gap:7px;margin:17px 0}
      .pa-panel label {font-size:16px;font-weight:800}
      .pa-panel select,.pa-panel input[type=time],.pa-panel input[type=text],.pa-panel textarea {
        display:block;box-sizing:border-box;width:100%;min-width:0;min-height:48px;
        background:#fff !important;color:#101827 !important;border:2px solid #94a3b8;
        border-radius:10px;padding:10px 12px;font-size:17px;font-weight:600
      }
      .pa-panel textarea {min-height:85px;resize:vertical}
      .pa-panel .pa-nota {font-size:14px;color:#e2e8f0 !important}
      .pa-panel .pa-detalle {margin:13px 0;padding:12px;border:1px solid #8795a7;border-radius:12px}
      .pa-panel .pa-detalle summary {cursor:pointer;color:#f8fafc;font-weight:850;font-size:16px}
      .pa-panel .pa-detalle pre {white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0 14px;
        font:600 14px/1.4 Arial,sans-serif;color:#f8fafc !important}
      .pa-panel .pa-detalle strong {display:block;margin-top:12px}
      .pa-panel .pa-estado {border-radius:10px;padding:12px;background:#12355c;color:#fff !important}
      .pa-panel .pa-check {display:flex;align-items:center;gap:12px}
      .pa-panel .pa-check input {flex:0 0 auto;width:24px;height:24px;accent-color:#0b5aba}
      .pa-panel button {width:100%;margin:8px 0;min-height:49px;border:0;border-radius:10px;
        background:#0b4a9d;color:#fff;font-size:16px;font-weight:800}
      .pa-panel button:disabled {opacity:.6}
      .pa-panel button[data-pa-previa] {background:#214c78}
      .pa-panel [data-pa-texto] {white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f5f9;
        color:#111827;padding:12px;border-radius:10px;max-height:320px;overflow:auto;font-size:14px}
      .pa-panel [data-pa-error] {color:#fff !important;font-weight:800;min-height:20px}
      .pa-panel [hidden] {display:none !important}
    </style>`;
  if (!operativoSeleccionado?.operativo_key) {
    panel.innerHTML = estilo + '<h2>Presencia Activa</h2><p>Seleccioná un operativo EN CURSO en el selector superior. No se crea otro operativo.</p>';
    return;
  }
  if (modoEnsayoActivo()) {
    panel.innerHTML = estilo + '<h2>Presencia Activa</h2><p>Para registrar un cambio se requiere un operativo real EN CURSO de Supabase.</p>';
    return;
  }

  panel.innerHTML = estilo + '<h2>Presencia Activa</h2><p role="status">Leyendo el INICIO y los recursos del operativo...</p>';
  const registro = await obtenerEstadoOperativoV2({
    guardia_fecha: operativoSeleccionado.guardia_fecha,
    operativo_key: operativoSeleccionado.operativo_key
  });
  if (!panel.isConnected || host.firstElementChild !== panel) return;
  if (!registro || registro.estado !== "EN_CURSO") {
    panel.innerHTML = estilo + '<h2>Presencia Activa</h2><p>El operativo ya no está EN CURSO. Actualizá la lista.</p>';
    return;
  }

  const activa = estaEnPresenciaActiva(registro);
  const accion = activa ? "RETOMAR" : "INICIAR";
  const datos = registro.datos && typeof registro.datos === "object" ? registro.datos : {};
  const estado = datos.presencia_activa || {};
  const heredado = obtenerDetallePresenciaActiva(registro);
  panel.innerHTML = estilo + [
    '<h2>' + (activa ? 'Retomar operativo normal' : 'Iniciar Presencia Activa') + '</h2>',
    '<div class="pa-estado"><strong>' + escapar(registro.tipo_nombre || registro.tipo_operativo || "Operativo") + '</strong>',
    '<p>' + escapar(registro.hora_inicio || "") + ' A ' + escapar(registro.hora_fin || "") + ' — ' + escapar(registro.lugar || "") + '</p>',
    '<p>' + (activa ? 'Modalidad actual: PRESENCIA ACTIVA' + (estado.motivo ? ' — ' + escapar(estado.motivo) : '') : 'Modalidad actual: OPERATIVO NORMAL') + '</p></div>',
    '<details class="pa-detalle"><summary>Ver personal, móviles e inventario heredados</summary>',
    '<strong>Personal policial</strong><pre>' + escapar(heredado.personal) + '</pre>',
    '<strong>Móviles</strong><pre>' + escapar(heredado.moviles) + '</pre>',
    '<strong>Elementos</strong><pre>' + escapar(heredado.elementos) + '</pre>',
    '<p class="pa-nota">Datos del INICIO y, si corresponde, los RELEVOS, ACOPLES y RETIROS registrados.</p>',
    '</details>',
    '<p class="pa-nota">El operativo y sus órdenes siguen siendo los mismos. La modalidad cambia sin registrar otro INICIO.</p>',
    '<form data-pa-form>',
    '<div class="pa-campo"><label for="paHora">Horario del informe (editable)</label>',
    '<input id="paHora" type="time" name="hora_reporte" required value="' + horaReporteBuenosAires() + '"></div>',
    activa ? '' : '<div class="pa-campo"><label for="paMotivo">Motivo de Presencia Activa</label><select id="paMotivo" name="motivo" required><option value="">Seleccionar motivo</option>' +
      MOTIVOS_PRESENCIA_ACTIVA.map(m => '<option value="' + escapar(m.valor) + '">' + escapar(m.etiqueta) + '</option>').join('') + '</select></div>',
    activa ? '' : '<div class="pa-campo" data-pa-otro hidden><label for="paOtro">Especificar otro motivo</label><input id="paOtro" type="text" name="otro_motivo" placeholder="Describí la causa"></div>',
    '<div class="pa-campo"><label for="paObservacion">Observaciones adicionales (opcional)</label>',
    '<textarea id="paObservacion" name="observacion_adicional" placeholder="Agregar información sin cambiar el INICIO"></textarea></div>',
    '<label class="pa-check"><input type="checkbox" name="adjunta_vista"><span>Se adjunta vista fotográfica</span></label>',
    '<p class="pa-nota">Si marcás esta opción, adjuntá la fotografía al mensaje de WhatsApp.</p>',
    '<button type="button" data-pa-previa>Vista previa del informe</button>',
    '<pre data-pa-texto hidden aria-live="polite"></pre>',
    '<p data-pa-error role="alert" aria-live="polite"></p>',
    '<button type="button" data-pa-guardar>' + (activa ? 'Guardar retorno y enviar por WhatsApp' : 'Guardar Presencia Activa y enviar por WhatsApp') + '</button>',
    '<button type="button" data-pa-reintentar hidden>Volver a abrir WhatsApp</button>',
    '</form>'
  ].join("");
  const form = panel.querySelector("[data-pa-form]");
  const motivo = form.querySelector("[name=motivo]");
  const otro = form.querySelector("[data-pa-otro]");
  const error = form.querySelector("[data-pa-error]");
  const previa = form.querySelector("[data-pa-texto]");
  const guardar = form.querySelector("[data-pa-guardar]");
  const reintentar = form.querySelector("[data-pa-reintentar]");
  let textoGuardado = "";

  form.addEventListener("submit", e => e.preventDefault());
  motivo?.addEventListener("change", () => {
    otro.hidden = motivo.value !== "OTROS";
    previa.hidden = true;
    error.textContent = "";
  });
  form.addEventListener("input", () => { previa.hidden = true; error.textContent = ""; });

  const preparar = () => {
    const formulario = new FormData(form);
    return prepararCambioPresenciaActiva({
      operativo: registro,
      accion,
      hora_reporte: formulario.get("hora_reporte"),
      motivo: formulario.get("motivo"),
      otro_motivo: formulario.get("otro_motivo"),
      observacion_adicional: formulario.get("observacion_adicional"),
      adjunta_vista: formulario.has("adjunta_vista")
    });
  };
  form.querySelector("[data-pa-previa]").addEventListener("click", () => {
    try {
      previa.textContent = preparar().texto;
      previa.hidden = false;
    } catch (e) { error.textContent = e.message; }
  });
  reintentar.addEventListener("click", () => {
    if (textoGuardado) abrirWhatsappConTexto(textoGuardado);
  });
  guardar.addEventListener("click", async () => {
    if (guardar.disabled) return;
    let preparado;
    try { preparado = preparar(); } catch (e) { error.textContent = e.message; return; }
    if (!confirm(accion === "INICIAR"
      ? "¿Confirmás el inicio de Presencia Activa en este mismo operativo?"
      : "¿Confirmás que se retoma el operativo con normalidad?")) return;
    const ventana = prepararVentanaWhatsapp();
    guardar.disabled = true;
    error.textContent = "Guardando evento...";
    try {
      const formulario = new FormData(form);
      const resultado = await guardarCambioPresenciaActiva({
        guardia_fecha: registro.guardia_fecha,
        operativo_key: registro.operativo_key,
        expected_updated_at: registro.updated_at,
        accion,
        hora_reporte: formulario.get("hora_reporte"),
        motivo: formulario.get("motivo"),
        otro_motivo: formulario.get("otro_motivo"),
        observacion_adicional: formulario.get("observacion_adicional"),
        adjunta_vista: formulario.has("adjunta_vista")
      });
      textoGuardado = resultado.texto;
      reintentar.hidden = false;
      error.textContent = "Evento guardado en el mismo operativo. Abriendo WhatsApp...";
      window.dispatchEvent(new CustomEvent("informesgp:envio-whatsapp-ok", {
        detail: { modo: "PRESENCIA_ACTIVA", transicion: accion, textoFinal: resultado.texto }
      }));
      abrirWhatsappConTexto(resultado.texto, { ventanaPreparada: ventana });
    } catch (e) {
      cerrarVentanaWhatsappPreparada(ventana);
      error.textContent = e?.message || "No se registró el cambio de modalidad.";
      guardar.disabled = false;
    }
  });
}
