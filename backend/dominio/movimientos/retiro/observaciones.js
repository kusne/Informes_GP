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

 return partes.join(" ");
}
