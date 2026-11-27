import { calcularMovimientoUnificado } from "./movimientos-unificados.js";
const vacio=()=>({personal:[],moviles:[],motos:[],elementos:{}});
const grupos=r=>["personal","moviles","motos",...Object.keys(r?.elementos||{}).map(k=>"elementos."+k)];
const lista=(r,k)=>k.startsWith("elementos.")?(r?.elementos?.[k.slice(10)]||[]):(r?.[k]||[]);
function agregar(r,k,v){if(k.startsWith("elementos.")){const sub=k.slice(10);(r.elementos[sub]??=[]).push(v);}else r[k].push(v);}
export function planificarTransferencias({actual,otro=null,altas={},bajas={},intervinientes={},transferencias={}}={}){
 const a=calcularMovimientoUnificado({actual,altas,bajas,intervinientes});
 const altasB=vacio(),bajasB=vacio();
 for(const k of new Set([...grupos(actual),...grupos(otro),...grupos(transferencias),...grupos(altas)])){
  for(const v of lista(transferencias,k)){
   if(!otro||!lista(a.retirados,k).includes(v))throw Error("Transferencia sin baja válida o sin operativo destino.");
   agregar(altasB,k,v);
  }
  if(otro)for(const v of lista(a.incorporados,k))if(lista(otro,k).includes(v))agregar(bajasB,k,v);
 }
 const tiene=r=>grupos(r).some(k=>lista(r,k).length);
 const b=tiene(altasB)||tiene(bajasB)?calcularMovimientoUnificado({actual:otro,altas:altasB,bajas:bajasB}):null;
 return {principal:a,secundario:b};
}
export function validarAltasSinDuplicar(movimientos,otros){
 const identidad=(k,v)=>k==="moviles"||k==="motos"?"movilidad:"+v:k+":"+v;
 const conjunto=r=>new Set(grupos(r).flatMap(k=>lista(r,k).map(v=>identidad(k,v))));
 const ocupados=new Set();
 for(const r of otros)for(const v of conjunto(r))ocupados.add(v);
 const vigentes=movimientos.map(m=>conjunto(m.vigente));
 for(let i=0;i<movimientos.length;i++)for(const v of conjunto(movimientos[i].incorporados)){
  if(ocupados.has(v)||vigentes.some((r,j)=>j!==i&&r.has(v)))throw Error("El recurso "+v+" ya está asignado a otro operativo. Seleccioná el operativo relacionado para transferirlo.");
 }
}

/** Sólo se atribuye transporte a personal efectivamente retirado y a un móvil
 * saliente o interviniente confirmado. No altera la dotación ni deduce choferes. */
export function opcionesTransporteRetiro(m){
 const movilidad=r=>[...(r?.moviles||[]),...(r?.motos||[])];
 return [...new Set([...movilidad(m?.retirados),...movilidad(m?.intervinientes)])];
}
export function validarTransporteRetiro(m,asignaciones=[]){
 if(!Array.isArray(asignaciones))throw Error("Asignaciones de retiro inválidas.");
 const personas=m?.retirados?.personal||[],moviles=opcionesTransporteRetiro(m),vistos=new Set();
 const salida=[];
 for(const a of asignaciones){
  if(!a||!personas.includes(a.personal)||vistos.has(a.personal)||!(a.movil===null||moviles.includes(a.movil)))
   throw Error("Asignación de retiro inválida: revisá el efectivo y el móvil.");
  vistos.add(a.personal);
  salida.push({personal:a.personal,movil:a.movil});
 }
 if(moviles.length&&personas.some(p=>!vistos.has(p)))
  throw Error("Indicá en qué móvil se retira cada efectivo, o confirmá que no utiliza ninguno de los indicados.");
 return salida;
}
