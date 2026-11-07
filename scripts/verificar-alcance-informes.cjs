/* En PR exige alcance autorizado para modificar cualquier archivo blindado. */
const cp=require("node:child_process"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const contratos=JSON.parse(fs.readFileSync(path.join(root,"protecciones/contratos-informes.json"),"utf8"));
const base=process.env.BASE_REF||"origin/main",body=process.env.PR_BODY||"";
const m=body.match(/^\s*INFORMES_AUTORIZADOS:\s*(.+)\s*$/im);
const permitidos=m?m[1].split(/[,;]/).map(v=>v.trim().toLowerCase()).filter(Boolean):[];
const rutas=cp.execFileSync("git",["diff","--name-only",base+"...HEAD"],{cwd:root,encoding:"utf8"}).split(/\r?\n/).filter(Boolean);
const comun=new Set(["backend/dominio/informes/informe-especial-salida-texto.js","backend/dominio/informes/informe-especial-validaciones.js","backend/dominio/informes/informe-especial-reglas-numerales.js","backend/dominio/informes/informe-especial-mapper-supabase.js","backend/aplicacion/procesamiento/procesar-informe-especial.js","frontend/pantallas/informes/informes.js","frontend/pantallas/informes/modelos-informes.js","api/app-api.js","api/persistencia-api.js","backend/infraestructura/supabase/informes-especiales-v2-repo.js"]);
function alcance(r){
 if(r==="protecciones/contratos-informes.json"||comun.has(r))return ["todos"];
 if(contratos.archivos[r])return contratos.archivos[r].alcance;
 const m=r.match(/^frontend\/pantallas\/informes\/modelos\/([^/]+)\//)||r.match(/^backend\/dominio\/informes\/modelos\/([^/]+)\//);
 if(m)return [m[1]];
 const m2=r.match(/^backend\/dominio\/movimientos\/(relevo|acople|retiro)\//);
 if(m2)return [m2[1]];
 if(r==="backend/dominio/movimientos/texto-movimiento.js")return ["relevo","acople","retiro"];
 if(/^frontend\/pantallas\/inicia\//.test(r)||/^backend\/dominio\/inicia\//.test(r))return ["inicio","presencia-activa"];
 if(/^frontend\/pantallas\/finaliza\//.test(r)||/^backend\/dominio\/finaliza\//.test(r))return ["finalizado","presencia-activa"];
 if(/^frontend\/pantallas\/movimientos\//.test(r))return ["relevo","acople","retiro"];
 if(/^backend\/dominio\/(compartido|informes)\//.test(r)||/^backend\/aplicacion\/procesamiento\//.test(r)||/^frontend\/pantallas\/informes\/(compartido|componentes)\//.test(r)||/^backend\/infraestructura\/supabase\/informes-/.test(r))return ["todos"];
 return [];
}
const errores=[];
for(const r of rutas){
 const a=alcance(r);
 if(a.length&&!permitidos.includes("todos")&&!a.every(x=>permitidos.includes(x)))errores.push(r+" (requiere: "+a.join(" o ")+")");
}
if(errores.length){console.error("Cambios protegidos sin autorización de alcance:\n"+errores.join("\n")+"\nDeclarar INFORMES_AUTORIZADOS: <tipo>, sólo con autorización expresa del propietario.");process.exit(1);}
console.log("Alcance correcto:",permitidos.join(", ")||"sin modelos modificados");
