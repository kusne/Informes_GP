const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5174;
const ROOT = path.resolve(__dirname, "../..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const clean = decoded === "/" ? "/index.html" : decoded;
  const fullPath = path.normalize(path.join(root, clean));

  if (!fullPath.startsWith(root)) {
    return null;
  }

  return fullPath;
}

const server = http.createServer((req, res) => {
  const filePath = safeJoin(ROOT, req.url);

  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Archivo no encontrado");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Informes_GP corriendo en http://localhost:${PORT}`);
});
