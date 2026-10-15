import { obtenerCatalogoRecursosOperativos } from "../../../backend/dominio/compartido/recursos/catalogo-recursos-operativos.js";
import { renderPersonalPolicial, obtenerPersonalSeleccionado } from "../inicia/componentes/personal-policial/personal-policial.js";
import { renderMovilidad, obtenerMovilidadSeleccionada } from "../inicia/componentes/movilidad/movilidad.js";
import { renderElementos, obtenerElementosSeleccionados } from "../inicia/componentes/elementos/elementos.js";
import { guardarMovimientoOperativo, dotacionVigenteOperativo } from "../../../backend/infraestructura/supabase/movimientos-recursos-repo.js";\nimport { obtenerEstadoOperativoV2 } from "../../../backend/infraestructura/supabase/operativos-estado-v2-repo.js";\nimport { consultarRecursosGuardiaV2 } from "../../../api/recursos-guardia-api.js";
import { abrirWhatsappConTexto, prepararVentanaWhatsapp, cerrarVentanaWhatsappPreparada } from "../../servicios/whatsapp/abrir-whatsapp.js";

export async function iniciarFormularioMovimiento({host,modo,operativoSeleccionado,onGuardado}={}){
 const tipo=String(modo||'').toUpperCase();
 if(!host||!['RELEVO','ACOPLE'].includes(tipo))return;
 if(!operativoSeleccionado?.operativo_key){
  host.textContent='Seleccione un operativo EN CURSO.';return;
 }
 const preguntas=tipo==='RELEVO'
  ?['¿Quién se queda / releva?','¿Qué móvil/es se queda/n?','¿Qué elementos quedan?']
  :['¿Qué personal se incorpora?','¿Qué móvil/es se acopla/n?','¿Qué elementos se incorporan?'];
 host.innerHTML='<section class="contenedor-dinamico-card">'+
  '<h2>'+tipo+'</h2><p>Todas las casillas comienzan destildadas. '+
  (tipo==='RELEVO'?'Seleccione sólo lo que queda a cargo.':'Seleccione sólo lo que se incorpora.')+'</p>'+
  '<h3>A) '+preguntas[0]+'</h3><div data-personal></div>'+
  '<h3>B) '+preguntas[1]+'</h3><div data-movilidad></div>'+
  '<h3>C) '+preguntas[2]+'</h3><div data-elementos></div>'+
  '<p data-error role="alert"></p>'+
  '<button type="button" data-enviar-movimiento>Enviar '+tipo+' por WhatsApp</button></section>';
 const catalogo=obtenerCatalogoRecursosOperativos();
 const registroActual=await obtenerEstadoOperativoV2({
  guardia_fecha:operativoSeleccionado.guardia_fecha,
  operativo_key:operativoSeleccionado.operativo_key
 });
 if(!registroActual || registroActual.estado!=='EN_CURSO')throw Error('El operativo ya no está EN CURSO.');
 const vigentes=dotacionVigenteOperativo(registroActual);
 // Los nombres y móviles reales se consultan en el padrón vigente.
 // Se mantienen visibles también los recursos del operativo que hayan
 // dejado de figurar en el padrón, para poder identificarlos en el relevo.
 const padron=await consultarRecursosGuardiaV2();
 const unir=(a,b)=>[...new Set([...(a||[]),...(b||[])])];
 catalogo.personal=unir(padron.personal,vigentes.personal);
 catalogo.moviles=unir(padron.moviles,vigentes.moviles);
 catalogo.motos=unir(padron.motos,vigentes.motos);
 for(const grupo of catalogo.elementos){
  grupo.items=unir(grupo.items,vigentes.elementos?.[grupo.clave]);
 }

 renderPersonalPolicial({host:host.querySelector('[data-personal]'),personal:catalogo.personal,seleccionInicial:[]});
 renderMovilidad({host:host.querySelector('[data-movilidad]'),moviles:catalogo.moviles,motos:catalogo.motos,seleccionInicial:{moviles:[],motos:[]}});
 renderElementos({host:host.querySelector('[data-elementos]'),grupos:catalogo.elementos,seleccionInicial:{}});
 const boton=host.querySelector('[data-enviar-movimiento]');
 const error=host.querySelector('[data-error]');
 boton.addEventListener('click',()=>{
  const seleccion={
   personal:obtenerPersonalSeleccionado(host),
   ...obtenerMovilidadSeleccionada(host),
   elementos:obtenerElementosSeleccionados(host)
  };
  const explicacion=tipo==='RELEVO'
   ?'Lo que NO seleccionaste se considerará retirado del operativo. ¿Confirmás el RELEVO?'
   :'Los recursos seleccionados se sumarán a la dotación vigente. ¿Confirmás el ACOPLE?';
  if(!confirm(explicacion))return;
  const ventana=prepararVentanaWhatsapp();
  boton.disabled=true;error.textContent='Guardando '+tipo+'...';
  guardarMovimientoOperativo({
   modo:tipo,operativo_key:operativoSeleccionado.operativo_key,
   guardia_fecha:operativoSeleccionado.guardia_fecha,seleccion
  }).then(({texto})=>{
   abrirWhatsappConTexto(texto,{ventanaPreparada:ventana});
   error.textContent=tipo+' guardado. Se abrió WhatsApp.';
   window.dispatchEvent(new CustomEvent('informesgp:envio-whatsapp-ok',{detail:{modo:tipo,textoFinal:texto}}));
   onGuardado?.();
  }).catch(e=>{
   cerrarVentanaWhatsappPreparada(ventana);
   error.textContent=e?.message||'No se pudo guardar el movimiento.';
  }).finally(()=>{boton.disabled=false;});
 });
}
