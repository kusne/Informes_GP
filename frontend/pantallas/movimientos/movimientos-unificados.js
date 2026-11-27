import { obtenerCatalogoRecursosOperativos, modoEnsayoActivo } from "../../../api/app-api.js";
import { obtenerEstadoOperativoV2, dotacionVigenteOperativo } from "../../../api/persistencia-api.js";
import { consultarRecursosGuardiaV2 } from "../../../api/recursos-guardia-api.js";
import { planificarTransferencias, tituloMovimientoUnificado, listarOperativosMovimiento, guardarMovimientoUnificado, opcionesTransporteRetiro, validarTransporteRetiro } from "../../../api/movimientos-unificados-api.js";
import { abrirWhatsappAppDirectamente } from "../../servicios/whatsapp/abrir-whatsapp.js";
const vacio=()=>({personal:[],moviles:[],motos:[],elementos:{}});
const lista=(r,k)=>k.startsWith("elementos.")?(r?.elementos?.[k.slice(10)]||[]):(r?.[k]||[]);
const agregar=(r,k,v)=>{if(k.startsWith("elementos.")){(r.elementos[k.slice(10)]??=[]).push(v);}else r[k].push(v);};
const unir=(...listas)=>[...new Set(listas.flat().filter(x=>x!=null).map(x=>String(x).trim()).filter(Boolean))];
export async function iniciarMovimientosUnificados({host,operativoSeleccionado}={}){
 if(!host||!operativoSeleccionado)return;
 host.innerHTML='<section class="contenedor-dinamico-card"><h2>MOVIMIENTOS</h2><p>Cargando dotación vigente…</p></section>';
 const panel=host.firstElementChild;
 const a=await obtenerEstadoOperativoV2(operativoSeleccionado);
 if(!a||a.estado!=="EN_CURSO")throw Error("El operativo ya no está EN CURSO.");
 const [padron,activos]=await Promise.all([consultarRecursosGuardiaV2(),listarOperativosMovimiento(a.guardia_fecha)]);
 if(!panel.isConnected)return;
 const actual=dotacionVigenteOperativo(a),catalogo=obtenerCatalogoRecursosOperativos();
 const otros=activos.filter(r=>r.id!==a.id&&r.estado==="EN_CURSO");
 const estados=new Map();
 const transporte=new Map();let firmaTransporte="";
 let b=null,otro=null,guardando=false,guardado="";
 panel.innerHTML='<h2>MOVIMIENTOS</h2><p>Los recursos vigentes permanecen por defecto. Marcá sólo los cambios reales. Los intervinientes no se incorporan a la dotación.</p><label>Otra patrulla / operativo (opcional) <select data-otro><option value="">Sin otro operativo registrado</option></select></label><p data-nota></p><div data-recursos></div><div data-transporte hidden></div><h3>Resultado previsto</h3><p data-clase aria-live="polite"></p><pre data-resumen style="white-space:pre-wrap;color:inherit;font:inherit"></pre><p data-error role="alert"></p><button type="button" data-enviar>Confirmar y enviar por WhatsApp</button><button type="button" data-reintentar hidden>Abrir WhatsApp</button>';
 const q=s=>panel.querySelector(s),selector=q("[data-otro]"),area=q("[data-recursos]"),boton=q("[data-enviar]"),error=q("[data-error]");
 for(const r of otros){
  const op=document.createElement("option");op.value=r.id;op.textContent=[r.tipo_nombre||r.tipo_operativo,r.lugar,r.hora_inicio,r.guardia_fecha].filter(Boolean).join(" · ");selector.append(op);
 }
 const grupos=[["personal","Personal policial",unir(padron.personal,catalogo.personal)],["moviles","Móviles",unir(padron.moviles)],["motos","Motos",unir(padron.motos)],...catalogo.elementos.map(g=>["elementos."+g.clave,g.etiqueta,g.items])];
 for(const k of Object.keys(actual.elementos||{}))if(!grupos.some(g=>g[0]==="elementos."+k))grupos.push(["elementos."+k,k,[]]);
 function leer(){
  const datos={altas:vacio(),bajas:vacio(),intervinientes:vacio(),transferencias:vacio()};
  for(const {k,v,accion} of estados.values()){
   if(accion==="alta")agregar(datos.altas,k,v);
   if(accion==="baja"||accion==="transferir")agregar(datos.bajas,k,v);
   if(accion==="transferir")agregar(datos.transferencias,k,v);
   if(accion==="interviene")agregar(datos.intervinientes,k,v);
  }
  return datos;
 }
 function leerTransporte(plan){
  const salida={principal:[],secundario:[]};
  for(const lado of ["principal","secundario"]){
   const m=plan[lado];if(!m||!opcionesTransporteRetiro(m).length)continue;
   for(const personal of m.retirados.personal){const valor=transporte.get(JSON.stringify([lado,personal]));if(valor!==undefined)salida[lado].push({personal,movil:valor});}
  }
  return salida;
 }
 function pintarTransporte(plan){
  const zona=q("[data-transporte]");
  const filas=["principal","secundario"].flatMap(lado=>{
   const m=plan[lado],opciones=opcionesTransporteRetiro(m);
   return opciones.length?(m?.retirados?.personal||[]).map(personal=>({lado,personal,opciones})):[];
  });
  const firma=JSON.stringify(filas);
  if(firma===firmaTransporte)return;
  firmaTransporte=firma;zona.replaceChildren();zona.hidden=!filas.length;
  const claves=new Set(filas.map(f=>JSON.stringify([f.lado,f.personal])));
  for(const key of transporte.keys())if(!claves.has(key))transporte.delete(key);
  if(!filas.length)return;
  const h=document.createElement("h3");h.textContent="¿En qué móvil se retira cada efectivo?";zona.append(h);
  for(const {lado,personal,opciones} of filas){
   const key=JSON.stringify([lado,personal]);const anterior=transporte.get(key);
   if(anterior!==null&&!opciones.includes(anterior))transporte.delete(key);
   const etiqueta=document.createElement("label");etiqueta.style.display="block";etiqueta.style.margin="8px 0";etiqueta.textContent=personal+(lado==="secundario"?" (otra patrulla)":"")+" — ";
   const sel=document.createElement("select");sel.setAttribute("aria-label","Móvil de retiro de "+personal);
   const items=[["","Seleccionar móvil"],["n","No utiliza ninguno de estos móviles"],...opciones.map(n=>["m:"+n,"Móvil N° "+n])];
   for(const [value,text] of items){const op=document.createElement("option");op.value=value;op.textContent=text;sel.append(op);}
   const valor=transporte.get(key);sel.value=valor===null?"n":valor===undefined?"":"m:"+valor;
   sel.addEventListener("change",()=>{if(!sel.value)transporte.delete(key);else transporte.set(key,sel.value==="n"?null:sel.value.slice(2));error.textContent="";mostrar();});
   etiqueta.append(sel);zona.append(etiqueta);
  }
 }
 const resumen=r=>["Personal: "+(r.personal.join(" / ")||"—"),"Móviles: "+([...r.moviles,...r.motos].join(" / ")||"—"),...Object.entries(r.elementos).filter(([,v])=>v.length).map(([k,v])=>k+": "+v.join(" / "))].join("\n");
 function mostrar(){
  try{
   const plan=planificarTransferencias({actual,otro,...leer()});
   q("[data-clase]").textContent=tituloMovimientoUnificado(plan.principal)+(plan.secundario?" + "+tituloMovimientoUnificado(plan.secundario)+" (otro operativo)":"");
   q("[data-resumen]").textContent="Dotación resultante del operativo:\n"+resumen(plan.principal.vigente)+(plan.secundario?"\n\nDotación resultante del otro operativo:\n"+resumen(plan.secundario.vigente):"");
   pintarTransporte(plan);
   try{const t=leerTransporte(plan);validarTransporteRetiro(plan.principal,t.principal);if(plan.secundario)validarTransporteRetiro(plan.secundario,t.secundario);}
   catch(e){q("[data-clase]").textContent+=" — "+e.message;boton.disabled=true;return null;}
   boton.disabled=guardando||!!guardado;
   return plan;
  }catch(e){pintarTransporte({});q("[data-clase]").textContent=e.message;q("[data-resumen]").textContent="";boton.disabled=true;return null;}
 }
 function pintar(){
  estados.clear();transporte.clear();firmaTransporte="";area.replaceChildren();
  q("[data-nota]").textContent=b?"Los recursos de la otra patrulla marcados «Se incorpora» se transfieren a ésta. Marcá «Pasa a la otra patrulla» para transferir en sentido contrario.":"Si se intercambian recursos con otro operativo registrado, elegilo arriba.";
  const gruposVista=[...grupos];
  for(const k of Object.keys(otro?.elementos||{}))if(!gruposVista.some(g=>g[0]==="elementos."+k))gruposVista.push(["elementos."+k,k,[]]);
  for(const [k,nombre,disponibles] of gruposVista){
   const vigentes=lista(actual,k).map(String),externos=lista(otro,k).map(String);
   const detalle=document.createElement("details");detalle.open=vigentes.length>0;
   const titulo=document.createElement("summary");titulo.textContent=nombre+" ("+vigentes.length+" vigentes)";detalle.append(titulo);
   for(const v of unir(vigentes,externos,disponibles)){
    const vigente=vigentes.includes(v),deOtro=externos.includes(v);
    const fila=document.createElement("label");fila.style.display="flex";fila.style.justifyContent="space-between";fila.style.gap="8px";fila.style.alignItems="center";fila.style.margin="6px 0";
    const texto=document.createElement("span");texto.textContent=v+(vigente?" · vigente":deOtro?" · otra patrulla":"");fila.append(texto);
    const select=document.createElement("select"),opts=vigente?[["","Permanece"],["baja","Se retira"],...(b?[["transferir","Pasa a la otra patrulla"]]:[])]:[["","No interviene"],["alta",deOtro?"Se transfiere a este operativo":"Se incorpora"],["interviene","Interviene sin permanecer"]];
    for(const [value,label] of opts){const op=document.createElement("option");op.value=value;op.textContent=label;select.append(op);}
    select.setAttribute("aria-label",nombre+" "+v);
    const key=JSON.stringify([k,v]);estados.set(key,{k,v,accion:""});
    select.addEventListener("change",()=>{estados.get(key).accion=select.value;error.textContent="";mostrar();});
    fila.append(select);detalle.append(fila);
   }
   area.append(detalle);
  }
  mostrar();
 }
 selector.addEventListener("change",()=>{
  if([...estados.values()].some(x=>x.accion)&&!confirm("Cambiar la patrulla relacionada reinicia las selecciones. ¿Continuar?")){selector.value=b?.id||"";return;}
  b=otros.find(r=>r.id===selector.value)||null;otro=b?dotacionVigenteOperativo(b):null;pintar();
 });
 const ref=r=>({operativo_key:r.operativo_key,guardia_fecha:r.guardia_fecha,updated_at:r.updated_at});
 q("[data-reintentar]").addEventListener("click",()=>{if(guardado)abrirWhatsappAppDirectamente(guardado);});
 boton.addEventListener("click",async()=>{
  if(guardando||guardado)return;
  const plan=mostrar();if(!plan)return;
  if(modoEnsayoActivo()){error.textContent="El modo ensayo no modifica los registros.";return;}
  if(!confirm("¿Confirmás el movimiento y la dotación resultante de los operativos indicados?"))return;
  guardando=true;boton.disabled=true;selector.disabled=true;panel.querySelectorAll("select").forEach(x=>x.disabled=true);
  try{
   const resultado=await guardarMovimientoUnificado({principal:ref(a),secundario:b?ref(b):null,...leer(),transporte_retiro:leerTransporte(plan)});
   guardado=resultado.texto;
   error.textContent="Movimiento guardado. Podés volver a abrir WhatsApp sin volver a guardar.";
   q("[data-reintentar]").hidden=false;
   window.dispatchEvent(new CustomEvent("informesgp:envio-whatsapp-ok",{detail:{modo:"MOVIMIENTOS",textoFinal:guardado}}));
   abrirWhatsappAppDirectamente(guardado);
  }catch(e){error.textContent=e.message||"No se pudo guardar.";if(!guardado){selector.disabled=false;panel.querySelectorAll("select").forEach(x=>x.disabled=false);}}
  finally{guardando=false;mostrar();}
 });
 pintar();
}
