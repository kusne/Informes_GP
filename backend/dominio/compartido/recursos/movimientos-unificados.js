// Clasificación pura de altas, bajas y recursos intervinientes. Sin escrituras ni dependencia de la UI.
export function calcularMovimientoUnificado({actual={},altas={},bajas={},intervinientes={}}={}) {
 const grupos=['personal','moviles','motos'];
 const normalizar=(valor,etiqueta)=>{
  if(valor==null)return [];
  if(!Array.isArray(valor))throw Error('Se esperaba una lista: '+etiqueta);
  const lista=valor.map(x=>{if(typeof x!=='string'&&typeof x!=='number')throw Error('Identidad inválida: '+etiqueta);return String(x).trim();});
  if(lista.some(x=>!x)||new Set(lista).size!==lista.length)throw Error('Identidades vacías o duplicadas: '+etiqueta);
  return lista;
 };
 const recursos=(v,etiqueta)=>{
  if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Recursos inválidos: '+etiqueta);
  if(Object.keys(v).some(k=>![...grupos,'elementos'].includes(k)))throw Error('Grupo de recursos desconocido: '+etiqueta);
  if(v.elementos!=null&&(typeof v.elementos!=='object'||Array.isArray(v.elementos)))throw Error('Elementos inválidos: '+etiqueta);
  const r=Object.fromEntries(grupos.map(k=>[k,normalizar(v[k],etiqueta+'.'+k)]));
  r.elementos=Object.fromEntries(Object.entries(v.elementos||{}).map(([k,l])=>[k,normalizar(l,etiqueta+'.'+k)]));
  const movilidad=[...r.moviles,...r.motos];
  if(new Set(movilidad).size!==movilidad.length)throw Error('Móvil duplicado entre categorías: '+etiqueta);
  return r;
 };
 const anterior=recursos(actual,'actual'), retirados=recursos(bajas,'bajas'), incorporados=recursos(altas,'altas'), transitorios=recursos(intervinientes,'intervinientes');
 const vigente={elementos:{}}, permanecen={elementos:{}};
 const aplicar=(a,b,c,t,etiqueta)=>{
  if(b.some(x=>!a.includes(x)))throw Error('Baja no vigente: '+etiqueta);
  if(c.some(x=>a.includes(x)||b.includes(x)))throw Error('Alta ya vigente o contradictoria: '+etiqueta);
  if(t.some(x=>a.includes(x)||c.includes(x)))throw Error('Interviniente confundido con dotación: '+etiqueta);
  const quedan=a.filter(x=>!b.includes(x));
  return {quedan,nuevo:[...quedan,...c]};
 };
 for(const k of grupos){
  const r=aplicar(anterior[k],retirados[k],incorporados[k],transitorios[k],k);
  vigente[k]=r.nuevo;permanecen[k]=r.quedan;
 }
 const claves=new Set([anterior,retirados,incorporados,transitorios].flatMap(r=>Object.keys(r.elementos)));
 for(const k of claves){
  for(const r of [anterior,retirados,incorporados,transitorios])if(!Object.hasOwn(r.elementos,k))Object.defineProperty(r.elementos,k,{value:[],enumerable:true,writable:true,configurable:true});
  const r=aplicar(anterior.elementos[k],retirados.elementos[k],incorporados.elementos[k],transitorios.elementos[k],k);
  Object.defineProperty(vigente.elementos,k,{value:r.nuevo,enumerable:true,writable:true,configurable:true});
  Object.defineProperty(permanecen.elementos,k,{value:r.quedan,enumerable:true,writable:true,configurable:true});
 }
 const movilidad=r=>[...r.moviles,...r.motos];
 const ocupados=movilidad(anterior), entran=movilidad(incorporados), visitas=movilidad(transitorios);
 if(entran.some(x=>ocupados.includes(x))||visitas.some(x=>ocupados.includes(x)||entran.includes(x)))throw Error('Identidad de móvil contradictoria entre categorías');
 if(anterior.personal.length&&!vigente.personal.length)throw Error('El operativo queda sin personal: corresponde FINALIZADO.');
 const clasificaciones=[];
 const clasificar=(recurso,sale,entra,total)=>{
  if(!sale&&!entra)return;
  const tipo=sale&&entra?(recurso==='personal'?'RELEVO':'INTERCAMBIO'):sale?'RETIRO':'ACOPLE';
  clasificaciones.push({recurso,tipo,...(tipo==='RELEVO'?{alcance:sale===total?'TOTAL':'PARCIAL'}:{})});
 };
 clasificar('personal',retirados.personal.length,incorporados.personal.length,anterior.personal.length);
 clasificar('movilidad',movilidad(retirados).length,entran.length,ocupados.length);
 clasificar('elementos',Object.values(retirados.elementos).flat().length,Object.values(incorporados.elementos).flat().length,Object.values(anterior.elementos).flat().length);
 if(!clasificaciones.length)throw Error('No hay cambios reales de dotación.');
 const modos=new Set(clasificaciones.map(x=>x.tipo));
 const modo=modos.size===1?[...modos][0]:'MOVIMIENTO_COMBINADO';
 return {modo,clasificaciones,anterior,vigente,retirados,incorporados,permanecen,intervinientes:transitorios};
}
