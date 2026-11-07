const movilidad = r => [...(r?.moviles || []), ...(r?.motos || [])];
const mostrar = valores => (valores || []).filter(Boolean).join(" / ");

const RANGOS = ["COMISARIO GENERAL","COMISARIO MAYOR","COMISARIO SUPERVISOR","COMISARIO",
  "SUBCOMISARIO","INSPECTOR","SUBINSPECTOR","OFICIAL PRINCIPAL","OFICIAL",
  "SUBOFICIAL MAYOR","SUBOFICIAL PRINCIPAL","SUBOFICIAL","SARGENTO","CABO","AGENTE"];
function ordenarPersonal(personal = []) {
 const posicion = nombre => {
  const n=String(nombre).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  const i=RANGOS.findIndex(r=>n===r||n.startsWith(r+" ")||n.startsWith(r+" DE POLICIA "));
  return i<0?RANGOS.length:i;
 };
 // Orden estable: el catálogo ya ordena por N.I. dentro de cada jerarquía.
 return [...personal].sort((a,b)=>posicion(a)-posicion(b));
}
// Expone sólo los equipos efectivamente retirados, con cantidad, tipo e identificador.
function describirElementosRetirados(grupos={}) {
 const nombres={
  escopetas:['escopeta','escopetas'],
  ht:['HT','HT'],
  pda:['PDA','PDA'],
  impresoras:['impresora','impresoras'],
  alometros:['alómetro','alómetros'],
  alcoholimetros:['alcoholímetro','alcoholímetros']
 };
 const detalles=[];
 for(const [grupo,seleccion] of Object.entries(grupos||{})){
  const elementos=[...new Set((Array.isArray(seleccion)?seleccion:[])
   .map(valor=>String(valor??'').trim()).filter(Boolean))];
  if(!elementos.length)continue;
  const etiquetas=nombres[grupo]||['elemento','elementos'];
  const cantidad='('+String(elementos.length).padStart(2,'0')+')';
  detalles.push(cantidad+' '+etiquetas[elementos.length===1?0:1]+' '+mostrar(elementos));
 }
 if(detalles.length<=1)return detalles[0]||'';
 return detalles.slice(0,-1).join(', ')+' y '+detalles[detalles.length-1];
}


export function redactarObservacionRetiro(m,hora){
 const partes=[];
 const retirados=movilidad(m.retirados);

  const salientes=ordenarPersonal(m.retirados.personal||[]);
  const elementos=describirElementosRetirados(m.retirados.elementos);
  const personas=salientes.length<2?salientes.join(''):
    salientes.slice(0,-1).join(', ')+' y '+salientes[salientes.length-1];
  let accion='';
  if(salientes.length===1 && retirados.length===1){
   accion='se retira el '+personas+' con móvil '+retirados[0];
  }else if(salientes.length && retirados.length===1){
   accion='se retira el personal policial '+personas+' con móvil '+retirados[0];
  }else if(salientes.length && retirados.length>1){
   accion='se retiran los móviles '+mostrar(retirados)+' junto al personal policial '+personas;
  }else if(salientes.length===1){
   accion='se retira el '+personas;
  }else if(salientes.length>1){
   accion='se retira el personal policial '+personas;
  }else if(retirados.length===1){
   accion='se retira el móvil '+retirados[0];
  }else if(retirados.length>1){
   accion='se retiran los móviles '+mostrar(retirados);
  }
  if(accion){
   partes.push('Siendo las '+hora+' hs '+accion+(elementos?' llevando '+elementos:'')+'.');
  }else if(elementos){
   partes.push('Siendo las '+hora+' hs se retiran del operativo '+elementos+'.');
  }
  partes.push('La dotación restante continúa afectada al operativo.');
  return partes.join(" ");
}
