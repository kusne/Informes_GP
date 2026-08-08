const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "../..");
const cache = new Map();

function limpiarSpecifier(spec) {
  return String(spec || "").split("?")[0].split("#")[0];
}

function crearModulo(file) {
  const absoluto = path.resolve(file);
  if (cache.has(absoluto)) return cache.get(absoluto);

  const codigo = fs.readFileSync(absoluto, "utf8");
  const modulo = new vm.SourceTextModule(codigo, {
    identifier: absoluto,
    initializeImportMeta(meta) {
      meta.url = `file://${absoluto}`;
    }
  });
  cache.set(absoluto, modulo);
  return modulo;
}

function resolverModulo(spec, referencia) {
  if (/^https?:/i.test(spec)) {
    const key = `remote:${spec}`;
    if (cache.has(key)) return cache.get(key);
    const remoto = new vm.SyntheticModule(["createClient"], function () {
      this.setExport("createClient", () => ({}));
    }, { identifier: key });
    cache.set(key, remoto);
    return remoto;
  }

  if (!spec.startsWith(".") && !spec.startsWith("/")) {
    throw new Error(`Import no soportado: ${spec} desde ${referencia.identifier}`);
  }

  const limpio = limpiarSpecifier(spec);
  const archivo = spec.startsWith("/")
    ? path.join(root, limpio.replace(/^\/+/, ""))
    : path.resolve(path.dirname(referencia.identifier), limpio);

  if (!fs.existsSync(archivo)) {
    throw new Error(`Módulo inexistente: ${spec} -> ${archivo}`);
  }

  return crearModulo(archivo);
}

function listarJs(dir) {
  const salida = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...listarJs(full));
    else if (entrada.isFile() && entrada.name.endsWith(".js")) salida.push(full);
  }
  return salida;
}

(async () => {
  const archivos = [
    ...listarJs(path.join(root, "frontend")),
    ...listarJs(path.join(root, "api"))
  ];
  const errores = [];

  // Crear primero todos los módulos locales evita problemas con grafos diamante/ciclos.
  for (const archivo of [...archivos, ...listarJs(path.join(root, "backend"))]) {
    try { crearModulo(archivo); } catch (error) { errores.push({ archivo, error }); }
  }

  for (const archivo of archivos) {
    try {
      const modulo = crearModulo(archivo);
      if (modulo.status === "unlinked") await modulo.link(resolverModulo);
    } catch (error) {
      errores.push({ archivo, error });
    }
  }

  const reDinamico = /import\(\s*["']([^"']+)["']\s*\)/g;
  for (const archivo of [...archivos, ...listarJs(path.join(root, "backend"))]) {
    const texto = fs.readFileSync(archivo, "utf8");
    let match;
    while ((match = reDinamico.exec(texto))) {
      const spec = match[1];
      if (/^https?:/i.test(spec) || (!spec.startsWith(".") && !spec.startsWith("/"))) continue;
      const limpio = limpiarSpecifier(spec);
      const destino = spec.startsWith("/")
        ? path.join(root, limpio.replace(/^\/+/, ""))
        : path.resolve(path.dirname(archivo), limpio);
      if (!fs.existsSync(destino)) errores.push({ archivo, error: new Error(`Import dinámico inexistente: ${spec}`) });
    }
  }

  if (errores.length) {
    console.error(`Validación de módulos falló: ${errores.length} error(es).`);
    for (const item of errores) console.error(`- ${path.relative(root, item.archivo)}: ${item.error.message}`);
    process.exit(1);
  }

  console.log(`Módulos válidos: ${archivos.length} módulos frontend/api enlazados sin errores.`);
})();
