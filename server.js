const http = require("node:http");
const path = require("node:path");
const crypto = require("node:crypto");
const { readFile, stat } = require("node:fs/promises");
const { users } = require("./data");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const sessions = {};

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function checkPassword(password, passwordHash) {
  const [salt, savedHash] = passwordHash.split(":");
  const enteredHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return enteredHash === savedHash;
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

async function loginUser(request, response) {
  try {
    const data = await readRequestBody(request);
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");
    const user = users.find((item) => item.email === email);

    if (!user || !checkPassword(password, user.passwordHash)) {
      sendJson(response, 401, { message: "Incorrect email or password." });
      return;
    }

    if (user.status !== "active") {
      sendJson(response, 403, { message: "This account is not active." });
      return;
    }

    const sessionId = crypto.randomBytes(24).toString("hex");
    sessions[sessionId] = user.id;

    response.setHeader("Set-Cookie", `sessionId=${sessionId}; HttpOnly; SameSite=Lax; Path=/`);
    sendJson(response, 200, {
      message: "Login successful.",
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    sendJson(response, 400, { message: error.message });
  }
}

function getSessionId(request) {
  const cookieHeader = request.headers.cookie || "";
  const sessionCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("sessionId="));

  return sessionCookie ? sessionCookie.split("=")[1] : null;
}

function getCurrentUser(request) {
  const sessionId = getSessionId(request);
  const userId = sessions[sessionId];
  return users.find((user) => user.id === userId) || null;
}

function sendCurrentSession(request, response) {
  const user = getCurrentUser(request);

  if (!user) {
    sendJson(response, 200, { user: null });
    return;
  }

  sendJson(response, 200, {
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
    },
  });
}

function logoutUser(request, response) {
  const sessionId = getSessionId(request);

  if (sessionId) {
    delete sessions[sessionId];
  }

  response.setHeader("Set-Cookie", "sessionId=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  sendJson(response, 200, { message: "Logout successful." });
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

  if (request.method === "POST" && pathname === "/login") {
    loginUser(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/session") {
    sendCurrentSession(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/logout") {
    logoutUser(request, response);
    return;
  }

  serveStaticFile(request, response);
});

server.listen(PORT, () => {
  console.log(`BookNook is running at http://localhost:${PORT}`);
});
