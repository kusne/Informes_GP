// Transiciones de dotación: RELEVO reemplaza, ACOPLE incorpora.
// Conserva la dotación anterior y el detalle de cada movimiento.
export function calcularMovimientoRecursos({modo,actual={},seleccion={}}={}){
 const tipo=String(modo||'').toUpperCase();
 if(!['RELEVO','ACOPLE'].includes(tipo))throw Error('Movimiento no permitido.');
 const grupos=['personal','moviles','motos'];
 const normalizar=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>String(x||'').trim()).filter(Boolean))];
 const antiguo={},nuevo={},retirados={},incorporados={},permanecen={};
 for(const grupo of grupos){
  antiguo[grupo]=normalizar(actual[grupo]);
  const escogidos=normalizar(seleccion[grupo]);
  nuevo[grupo]=tipo==='RELEVO'?escogidos:normalizar([...antiguo[grupo],...escogidos]);
  retirados[grupo]=antiguo[grupo].filter(x=>!nuevo[grupo].includes(x));
  incorporados[grupo]=nuevo[grupo].filter(x=>!antiguo[grupo].includes(x));
  permanecen[grupo]=nuevo[grupo].filter(x=>antiguo[grupo].includes(x));
 }
 antiguo.elementos={};nuevo.elementos={};retirados.elementos={};incorporados.elementos={};permanecen.elementos={};
 for(const grupo of new Set([...Object.keys(actual.elementos||{}),...Object.keys(seleccion.elementos||{})])){
  const previo=normalizar(actual.elementos?.[grupo]),elegido=normalizar(seleccion.elementos?.[grupo]);
  const despues=tipo==='RELEVO'?elegido:normalizar([...previo,...elegido]);
  antiguo.elementos[grupo]=previo;
  nuevo.elementos[grupo]=despues;
  retirados.elementos[grupo]=previo.filter(x=>!despues.includes(x));
  incorporados.elementos[grupo]=despues.filter(x=>!previo.includes(x));
  permanecen.elementos[grupo]=despues.filter(x=>previo.includes(x));
 }
 const cantidad=r=>grupos.reduce((a,k)=>a+r[k].length,0)+Object.values(r.elementos).reduce((a,v)=>a+v.length,0);
 if(!cantidad(nuevo))throw Error('Seleccioná los recursos que quedarán asignados.');
 if(tipo==='ACOPLE'&&!cantidad(incorporados))throw Error('No se seleccionaron recursos nuevos para el acople.');
 if(tipo==='RELEVO'&&!cantidad(retirados)&&!cantidad(incorporados))
  throw Error('El RELEVO no modifica la dotación vigente: seleccioná un cambio real de personal, móviles o elementos.');
 return {modo:tipo,anterior:antiguo,vigente:nuevo,retirados,incorporados,permanecen};
}
