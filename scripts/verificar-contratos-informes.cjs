/* Verifica que los informes protegidos no cambien sin actualizar su contrato. */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const cp = require("node:child_process");
const root = path.resolve(__dirname, "..");
const contratos = JSON.parse(fs.readFileSync(path.join(root,"protecciones/contratos-informes.json"),"utf8"));
const errores=[];
function gitSha(blob){return crypto.createHash("sha1").update(Buffer.from("blob "+blob.length+"\0")).update(blob).digest("hex");}
function esModelo(r){
  return /^frontend\/pantallas\/informes\/modelos\/[^/]+\//.test(r)
    || /^backend\/dominio\/informes\/modelos\/[^/]+\//.test(r)
    || /^backend\/dominio\/movimientos\//.test(r)
    || /^frontend\/pantallas\/(inicia|finaliza|movimientos)\//.test(r)
    || /^frontend\/pantallas\/informes\/(compartido|componentes)\//.test(r)
    || /^backend\/dominio\/(inicia|finaliza|compartido|informes)\//.test(r)
    || /^backend\/aplicacion\/procesamiento\//.test(r)
    || /^backend\/infraestructura\/supabase\/informes-/.test(r);
}
for(const [r,info] of Object.entries(contratos.archivos)){
 const f=path.join(root,r);
 if(!fs.existsSync(f)){errores.push("Archivo protegido eliminado: "+r);continue;}
 if(gitSha(fs.readFileSync(f))!==info.sha)errores.push("Cambio sin actualizar contrato: "+r+" ["+info.alcance.join(", ")+"]");
}
const tracked=cp.execFileSync("git",["ls-files","-z"],{cwd:root}).toString().split("\0").filter(Boolean);
for(const r of tracked)if(esModelo(r)&&!contratos.archivos[r])errores.push("Archivo nuevo de informe sin contrato: "+r);
if(errores.length){console.error("BLOQUEO DE CONTRATOS:\n"+errores.join("\n"));process.exit(1);}
console.log("Contratos verificados:",Object.keys(contratos.archivos).length);
