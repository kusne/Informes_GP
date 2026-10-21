import { obtenerCatalogoRecursosOperativos, modoEnsayoActivo } from "../../../api/app-api.js";
import { renderPersonalPolicial, obtenerPersonalSeleccionado } from "../inicia/componentes/personal-policial/personal-policial.js";
import { renderMovilidad, obtenerMovilidadSeleccionada } from "../inicia/componentes/movilidad/movilidad.js";
import { renderElementos, obtenerElementosSeleccionados } from "../inicia/componentes/elementos/elementos.js";
import { guardarMovimientoOperativo, dotacionVigenteOperativo } from "../../../api/persistencia-api.js";
import { obtenerEstadoOperativoV2 } from "../../../api/persistencia-api.js";
import { consultarRecursosGuardiaV2 } from "../../../api/recursos-guardia-api.js";
import { abrirWhatsappAppDirectamente } from "../../servicios/whatsapp/abrir-whatsapp.js";

export async function iniciarFormularioMovimiento({host,modo,operativoSeleccionado,onGuardado}={}){
 const tipo=String(modo||'').toUpperCase();
 if(!host||!['RELEVO','ACOPLE','RETIRO'].includes(tipo))return;
 if(!operativoSeleccionado?.operativo_key){
  host.textContent='Seleccione un operativo EN CURSO.';return;
 }
 const preguntas=tipo==='RELEVO'
  ?['¿Quién se queda / releva?','¿Qué móvil/es se queda/n?','¿Qué elementos quedan?']
  :tipo==='RETIRO'
  ?['¿Qué personal se retira?','¿Qué móvil/es se retira/n?','¿Qué elementos se retiran?']
  :['¿Qué personal se incorpora?','¿Qué móvil/es se acopla/n?','¿Qué elementos se incorporan?'];
 host.innerHTML='<section class="contenedor-dinamico-card" style="color:#f8fafc">'+
  '<h2 style="color:#fff;font-weight:800">'+tipo+'</h2><p style="color:#f1f5f9">Todas las casillas comienzan destildadas. '+
  (tipo==='RELEVO'?'Seleccione sólo lo que queda a cargo.':tipo==='RETIRO'?'Seleccione exclusivamente los recursos vigentes que se retiran.':'Seleccione sólo lo que se incorpora.')+'</p>'+
  '<h3 style="color:#fff;font-weight:700">A) '+preguntas[0]+'</h3><div data-personal></div>'+
  '<h3 style="color:#fff;font-weight:700">B) '+preguntas[1]+'</h3><div data-movilidad></div>'+
  '<h3 style="color:#fff;font-weight:700">C) '+preguntas[2]+'</h3><div data-elementos></div>'+
  '<p data-error role="alert" style="color:#fff"></p>'+
  '<button type="button" data-reintentar-whatsapp hidden>Abrir WhatsApp</button>'+
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
 catalogo.personal=tipo==='RETIRO'?vigentes.personal:unir(padron.personal,vigentes.personal);
 catalogo.moviles=tipo==='RETIRO'?vigentes.moviles:unir(padron.moviles,vigentes.moviles);
 catalogo.motos=tipo==='RETIRO'?vigentes.motos:unir(padron.motos,vigentes.motos);
 for(const grupo of catalogo.elementos){
  grupo.items=tipo==='RETIRO'?(vigentes.elementos?.[grupo.clave]||[]):unir(grupo.items,vigentes.elementos?.[grupo.clave]);
 }

 renderPersonalPolicial({host:host.querySelector('[data-personal]'),personal:catalogo.personal,seleccionInicial:[]});
 renderMovilidad({host:host.querySelector('[data-movilidad]'),moviles:catalogo.moviles,motos:catalogo.motos,seleccionInicial:{moviles:[],motos:[]}});
 renderElementos({host:host.querySelector('[data-elementos]'),grupos:catalogo.elementos,seleccionInicial:{}});
 const boton=host.querySelector('[data-enviar-movimiento]');
 const error=host.querySelector('[data-error]');
 const reintentar=host.querySelector('[data-reintentar-whatsapp]');
 let textoGuardado='';
 reintentar.addEventListener('click',()=>{
  if(textoGuardado)abrirWhatsappAppDirectamente(textoGuardado);
 });
 boton.addEventListener('click',()=>{
  const seleccion={
   personal:obtenerPersonalSeleccionado(host),
   ...obtenerMovilidadSeleccionada(host),
   elementos:obtenerElementosSeleccionados(host)
  };
  const explicacion=tipo==='RELEVO'
   ?'Lo que NO seleccionaste se considerará retirado del operativo. ¿Confirmás el RELEVO?'
   :tipo==='RETIRO'
   ?'Sólo los recursos seleccionados dejarán el operativo; no habrá reemplazos. ¿Confirmás el RETIRO?'
   :'Los recursos seleccionados se sumarán a la dotación vigente. ¿Confirmás el ACOPLE?';
  if(!confirm(explicacion))return;
  if(modoEnsayoActivo()){error.textContent='Los movimientos no guardan cambios en modo ensayo.';return;}
  boton.disabled=true;error.textContent='Guardando '+tipo+'...';
  guardarMovimientoOperativo({
   modo:tipo,operativo_key:operativoSeleccionado.operativo_key,
   guardia_fecha:operativoSeleccionado.guardia_fecha,seleccion
  }).then(({texto})=>{
   textoGuardado=texto;
   reintentar.hidden=false;
   error.textContent=tipo+' guardado. Si WhatsApp no se abre, tocá «Abrir WhatsApp».';
   window.dispatchEvent(new CustomEvent('informesgp:envio-whatsapp-ok',{detail:{modo:tipo,textoFinal:texto}}));
   // Enlace nativo: no utiliza wa.me ni api.whatsapp.com.
   abrirWhatsappAppDirectamente(texto);
  }).catch(e=>{
   error.textContent=e?.message||'No se pudo guardar el movimiento.';
   if(!textoGuardado)boton.disabled=false;
  });
 });
}
