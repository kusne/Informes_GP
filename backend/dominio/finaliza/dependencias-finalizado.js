// Vista institucional de dependencias incorporadas a INICIO.
// La pertenencia se obtiene del historial del operativo; la presencia efectiva
// se verifica contra la selección ACTUAL de FINALIZADO (tras RELEVO/RETIRO).
// Este módulo no escribe en Supabase ni modifica los recursos de revista.
const texto = valor => String(valor ?? "").trim();
const lineas = valor => texto(valor).split(/\r?\n/).map(texto).filter(Boolean);
const movilidad = valor => texto(valor).split(/\s*(?:\/|,|;|\r?\n)\s*/).map(texto).filter(Boolean);
const clave = valor => texto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .toLowerCase().replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
const clavePersonal = valor => clave(valor).replace(/\bsubof\b/g,"suboficial")
  .replace(/\bof\b/g,"oficial");
const claveMovil = valor => {
  const plano=clave(valor);
  const soloNumero=plano.match(/^(?:n|no|numero)?\s*(\d{3,6})$/);
  return soloNumero ? soloNumero[1] : plano;
};
const unicos = (valores, obtenerClave) => {
  const vistos=new Set();
  return valores.filter(v=>{
    const k=obtenerClave(v);
    if(!k || vistos.has(k))return false;
    vistos.add(k);return true;
  });
};

export function etiquetaDependenciaFinalizado(nombre) {
  return /^SUB\s*BASE(?:\s+U\.?\s*O\.?\s*R\.?\s*\d+)?$/i.test(texto(nombre))
    ? "Sub Base" : texto(nombre);
}

export function distribuirDependenciasFinalizado({formulario={},operativo={}}={}) {
  const datos=operativo?.datos && typeof operativo.datos==="object" ? operativo.datos : {};
  const deps=Array.isArray(datos.dependencias_agregadas) ? datos.dependencias_agregadas : [];
  const personal=lineas(formulario.personal);
  const moviles=movilidad(formulario.moviles_motos);
  if(!deps.length)return {personalPrincipal:formulario.personal||"",movilesPrincipales:formulario.moviles_motos||"",bloques:[]};

  // Los recursos que ya eran propios antes de la incorporación permanecen
  // en las secciones originales, incluso ante entradas repetidas.
  const inicio=datos.inicio_snapshot && typeof datos.inicio_snapshot==="object" ? datos.inicio_snapshot : {};
  const principalesPersonal=new Set(lineas(inicio.personal).map(clavePersonal));
  const principalesMoviles=new Set(movilidad(inicio.moviles_motos).map(claveMovil));
  const asignadosPersonal=new Set(),asignadosMoviles=new Set();
  const bloques=[];

  for(const dep of deps) {
    const nombre=texto(dep?.nombre);
    if(!nombre)continue;
    const clavesPersonal=new Set(lineas(dep.personal).map(clavePersonal));
    const clavesMoviles=new Set(movilidad(dep.moviles).map(claveMovil));
    const personalGrupo=unicos(personal.filter(p=>{
      const k=clavePersonal(p);
      return clavesPersonal.has(k) && !principalesPersonal.has(k) && !asignadosPersonal.has(k);
    }),clavePersonal);
    const movilesGrupo=unicos(moviles.filter(m=>{
      const k=claveMovil(m);
      return clavesMoviles.has(k) && !principalesMoviles.has(k) && !asignadosMoviles.has(k);
    }),claveMovil);
    personalGrupo.forEach(p=>asignadosPersonal.add(clavePersonal(p)));
    movilesGrupo.forEach(m=>asignadosMoviles.add(claveMovil(m)));
    if(!personalGrupo.length&&!movilesGrupo.length)continue; // dependencia retirada íntegramente
    bloques.push({
      nombre, etiqueta:etiquetaDependenciaFinalizado(nombre),
      personal:personalGrupo, moviles:movilesGrupo
    });
  }

  return {
    personalPrincipal:unicos(personal.filter(p=>!asignadosPersonal.has(clavePersonal(p))),clavePersonal).join("\n"),
    movilesPrincipales:unicos(moviles.filter(m=>!asignadosMoviles.has(claveMovil(m))),claveMovil).join(" / "),
    bloques
  };
}

export function bloquesDependenciasFinalizado(bloques=[]) {
  const salida=[];
  for(const bloque of bloques) {
    const lineas=[];
    if(bloque.personal.length)lineas.push("*Personal "+bloque.etiqueta+":*",...bloque.personal);
    if(bloque.moviles.length)lineas.push("*Movil "+bloque.etiqueta+":* "+bloque.moviles.join(" / "));
    if(lineas.length)salida.push(lineas.join("\n"));
  }
  return salida.join("\n\n");
}
