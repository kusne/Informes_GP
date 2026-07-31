const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const backend = path.join(root, "backend");
const errores = [];

function recorrer(dir) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entrada.name);
    if (entrada.isDirectory()) recorrer(full);
    else if (entrada.isFile() && entrada.name.endsWith(".js")) revisar(full);
  }
}

function revisar(file) {
  const texto = fs.readFileSync(file, "utf8");
  if (/from\s*["'][^"']*frontend\//.test(texto) || /import\s*\(\s*["'][^"']*frontend\//.test(texto)) {
    errores.push(path.relative(root, file));
  }
}

recorrer(backend);
if (errores.length) {
  console.error("Dependencias backend -> frontend detectadas:");
  errores.forEach((x) => console.error("- " + x));
  process.exit(1);
}
console.log("Arquitectura válida: backend no depende de frontend.");
