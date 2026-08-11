const http = require("node:http");
const path = require("node:path");
const crypto = require("node:crypto");
const { readFile, stat } = require("node:fs/promises");
const { users } = require("./data");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// Password for the sample account: Reader123!
users[0].passwordHash = hashPassword("Reader123!");

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

function sendJson(response, status, data) {
  send(response, status, JSON.stringify(data), "application/json; charset=utf-8");
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid form data"));
      }
    });
  });
}

async function registerUser(request, response) {
  try {
    const data = await readRequestBody(request);
    const fullName = String(data.fullName || "").trim();
    const username = String(data.username || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const introduction = String(data.introduction || "").trim();
    const password = String(data.password || "");

    if (!fullName || !username || !email || !password) {
      sendJson(response, 400, { message: "Please complete all required fields." });
      return;
    }

    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
      sendJson(response, 400, { message: "The username is not valid." });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sendJson(response, 400, { message: "The email address is not valid." });
      return;
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      sendJson(response, 400, { message: "The password is not valid." });
      return;
    }

    const usernameExists = users.some((user) => user.username.toLowerCase() === username.toLowerCase());
    const emailExists = users.some((user) => user.email === email);

    if (usernameExists || emailExists) {
      sendJson(response, 409, { message: "The username or email is already registered." });
      return;
    }

    const newUser = {
      id: users.length + 1,
      fullName,
      username,
      email,
      introduction,
      passwordHash: hashPassword(password),
      role: "member",
      status: "active",
    };

    users.push(newUser);

    sendJson(response, 201, {
      message: "Registration successful.",
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error) {
    sendJson(response, 400, { message: error.message });
  }
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

const server = http.createServer(function (request, response) {
  const pathname = new URL(request.url, "http://localhost").pathname;

  if (request.method === "POST" && pathname === "/register") {
    registerUser(request, response);
    return;
  }

  serveStaticFile(request, response);
});

server.listen(PORT, () => {
  console.log(`BookNook is running at http://localhost:${PORT}`);
});
