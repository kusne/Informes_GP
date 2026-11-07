const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const errores = [];

const carpetas = {
  frontend: path.join(root, "frontend"),
  api: path.join(root, "api"),
  backend: path.join(root, "backend")
};

const GLOBALES_UI_PROHIBIDOS_BACKEND = [
  /\bwindow\b/,
  /\bdocument\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bnavigator\b/,
  /\bCustomEvent\b/
];

const INFRAESTRUCTURA_PROHIBIDA_FRONTEND = [
  /@supabase\/supabase-js/i,
  /supabase-js@/i,
  /\bcreateClient\s*\(/,
  /https:\/\/[a-zA-Z0-9-]+\.supabase\.co/i
];

function archivosJs(dir) {
  const salida = [];
  if (!fs.existsSync(dir)) return salida;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...archivosJs(full));
    else if (entrada.isFile() && entrada.name.endsWith(".js")) salida.push(full);
  }
  return salida;
}

function importsDe(texto) {
  const specs = [];
  const re = /(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g;
  let match;
  while ((match = re.exec(texto))) specs.push(match[1]);
  return specs;
}

function sinComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

for (const file of archivosJs(carpetas.frontend)) {
  const texto = fs.readFileSync(file, "utf8");
  for (const spec of importsDe(texto)) {
    if (spec.includes("backend/")) {
      errores.push(`${rel(file)}: frontend importa backend directamente -> ${spec}`);
    }
  }

  const codigo = sinComentarios(texto);
  for (const patron of INFRAESTRUCTURA_PROHIBIDA_FRONTEND) {
    if (patron.test(codigo)) {
      errores.push(`${rel(file)}: frontend intenta acceder directamente a infraestructura Supabase (${patron})`);
    }
  }
}

for (const file of archivosJs(carpetas.backend)) {
  if (path.resolve(file) === path.resolve(__filename)) continue;
  const texto = fs.readFileSync(file, "utf8");
  for (const spec of importsDe(texto)) {
    if (spec.includes("frontend/") || spec.includes("api/")) {
      errores.push(`${rel(file)}: backend depende de una capa superior -> ${spec}`);
    }
  }

  const codigo = sinComentarios(texto);
  for (const patron of GLOBALES_UI_PROHIBIDOS_BACKEND) {
    if (patron.test(codigo)) {
      errores.push(`${rel(file)}: backend usa global de navegador/UI prohibido (${patron})`);
    }
  }
}

for (const file of archivosJs(carpetas.api)) {
  const texto = fs.readFileSync(file, "utf8");
  for (const spec of importsDe(texto)) {
    if (spec.includes("frontend/")) {
      errores.push(`${rel(file)}: api no puede depender de frontend -> ${spec}`);
    }
  }
}

// El shell público tampoco debe saltarse la frontera mediante preloads/scripts.
for (const nombre of ["index.html", "sw.js"]) {
  const file = path.join(root, nombre);
  if (!fs.existsSync(file)) continue;
  const texto = fs.readFileSync(file, "utf8");
  if (nombre === "index.html" && /(?:src|href)=["'][^"']*backend\//i.test(texto)) {
    errores.push(`${nombre}: carga backend directamente desde el shell público`);
  }
  if (nombre === "index.html" && /https:\/\/[a-zA-Z0-9-]+\.supabase\.co/i.test(texto)) {
    errores.push(`${nombre}: el shell frontend conoce directamente la infraestructura Supabase`);
  }
}

// Excepciones LEGADAS verificadas por SHA: se toleran sólo mientras los
// archivos permanezcan idénticos. Una modificación invalida la excepción.
const crypto = require("node:crypto");
const deudaLegada = new Map([
  ["frontend/compatibilidad/control-moviles/control-moviles.js","9dcda94b43f93a85733b6b901fbf7aeeb9c25407"],
  ["frontend/pantallas/control-moviles/control-moviles.js","25f1bf8636d69cb42518658bdf7a0dfb95c3685c"],
  ["frontend/pantallas/informes/modelos/alcoholemia-positiva/alcoholemia-positiva.js","cd4b4c59fc8e5e9e0bcb2d52380cddde70c67666"],
  ["frontend/pantallas/informes/modelos/decreto-460-22/decreto-460-22.js","14f51a2fe2042ba2033552daae71989d52dc727c"],
  ["frontend/pantallas/movimientos/movimientos.js","5bcb79aa8a25df6d3fbb72af6b024ab43007ba32"]
]);
function hashGit(file) {
  const buf=fs.readFileSync(file);
  return crypto.createHash("sha1").update(Buffer.from("blob "+buf.length+"\0")).update(buf).digest("hex");
}
const erroresNuevos = errores.filter(mensaje => {
  const nombre=mensaje.split(": ")[0];
  const original=deudaLegada.get(nombre);
  if(!original)return true;
  return hashGit(path.join(root,nombre))!==original;
});
const excepciones = errores.length-erroresNuevos.length;
if(excepciones) console.warn("ATENCIÓN: "+excepciones+" violaciones de arquitectura legadas, congeladas por hash. No se autorizan nuevas.");

if (erroresNuevos.length) {
  console.error("Arquitectura inválida:");
  erroresNuevos.forEach((x) => console.error(`- ${x}`));
  process.exit(1);
}

console.log("Arquitectura válida:");
console.log("- frontend -> api: permitido");
console.log("- frontend -> backend: sin nuevas dependencias directas");
console.log("- frontend -> Supabase: sin nuevos accesos directos");
console.log("- api -> backend: permitido");
console.log("- backend -> api/frontend: 0 dependencias");
console.log("- backend -> DOM/window/storage/eventos UI: 0 dependencias");

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}
