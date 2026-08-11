const http = require("node:http");
const path = require("node:path");
const { readFile, stat } = require("node:fs/promises");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function send(response, status, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(status, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
}

function resolvePublicPath(pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;

  if (requestedPath.split("/").some((segment) => segment.startsWith("."))) {
    return null;
  }

  const filePath = path.resolve(ROOT, `.${requestedPath}`);
  const isInsideRoot = filePath === ROOT || filePath.startsWith(`${ROOT}${path.sep}`);
  return isInsideRoot ? filePath : null;
}

async function serveStaticFile(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, "Method not allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    send(response, 400, "Invalid request URL");
    return;
  }

  const filePath = resolvePublicPath(pathname);
  if (!filePath) {
    send(response, 404, "Page not found");
    return;
  }

  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) {
      throw new Error("Not a file");
    }

    const body = request.method === "HEAD" ? "" : await readFile(filePath);
    const contentType = contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    send(response, 200, body, contentType);
  } catch {
    send(response, 404, "Page not found");
  }
}

const server = http.createServer(serveStaticFile);

server.listen(PORT, () => {
  console.log(`BookNook is running at http://localhost:${PORT}`);
});
