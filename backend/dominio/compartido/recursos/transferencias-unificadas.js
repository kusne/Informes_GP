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
