const express = require("express");
const path = require("node:path");
const crypto = require("node:crypto");
const { users, blogPosts } = require("./data");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const sessions = {};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

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

app.post("/register", (request, response) => {
  const fullName = String(request.body.fullName || "").trim();
  const username = String(request.body.username || "").trim();
  const email = String(request.body.email || "").trim().toLowerCase();
  const introduction = String(request.body.introduction || "").trim();
  const password = String(request.body.password || "");

  if (!fullName || !username || !email || !password) {
    response.status(400).json({ message: "Please complete all required fields." });
    return;
  }

  if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
    response.status(400).json({ message: "The username is not valid." });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ message: "The email address is not valid." });
    return;
  }

  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    response.status(400).json({ message: "The password is not valid." });
    return;
  }

  const usernameExists = users.some((user) => user.username.toLowerCase() === username.toLowerCase());
  const emailExists = users.some((user) => user.email === email);

  if (usernameExists || emailExists) {
    response.status(409).json({ message: "The username or email is already registered." });
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
  response.status(201).json({
    message: "Registration successful.",
    user: {
      id: newUser.id,
      fullName: newUser.fullName,
      username: newUser.username,
      email: newUser.email,
    },
  });
});

app.post("/login", (request, response) => {
  const email = String(request.body.email || "").trim().toLowerCase();
  const password = String(request.body.password || "");
  const user = users.find((item) => item.email === email);

  if (!user || !checkPassword(password, user.passwordHash)) {
    response.status(401).json({ message: "Incorrect email or password." });
    return;
  }

  if (user.status !== "active") {
    response.status(403).json({ message: "This account is not active." });
    return;
  }

  const sessionId = crypto.randomBytes(24).toString("hex");
  sessions[sessionId] = user.id;
  response.setHeader("Set-Cookie", `sessionId=${sessionId}; HttpOnly; SameSite=Lax; Path=/`);
  response.json({
    message: "Login successful.",
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
    },
  });
});

app.get("/session", (request, response) => {
  const user = getCurrentUser(request);

  if (!user) {
    response.json({ user: null });
    return;
  }

  response.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
    },
  });
});

app.post("/logout", (request, response) => {
  const sessionId = getSessionId(request);

  if (sessionId) {
    delete sessions[sessionId];
  }

  response.setHeader("Set-Cookie", "sessionId=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  response.json({ message: "Logout successful." });
});

function getBlogPostsWithAuthors() {
  return blogPosts.map((post) => {
    const author = users.find((user) => user.id === post.authorId);
    return { ...post, author: author ? author.fullName : "Unknown author" };
  });
}

app.get("/blogs-data", (request, response) => {
  response.json(getBlogPostsWithAuthors());
});

const pageNames = [
  "admin-users",
  "blog-create",
  "cart",
  "checkout",
  "forum-main",
  "forum-new-topic",
  "forum-topic",
  "login",
  "product-detail",
  "products",
  "profile",
  "register",
  "sitemap",
  "wishlist",
];

function getActivePage(pageName) {
  if (pageName.includes("blog")) return "blog";
  if (pageName.includes("product")) return "shop";
  if (pageName.includes("forum")) return "forum";
  return "";
}

app.get("/", (request, response) => {
  response.render("index", { activePage: "home" });
});

app.get("/blogs", (request, response) => {
  response.render("blogs", {
    activePage: "blog",
    posts: getBlogPostsWithAuthors(),
  });
});

app.get("/:page", (request, response, next) => {
  const pageName = request.params.page;

  if (!pageNames.includes(pageName)) {
    next();
    return;
  }

  response.render(pageName, { activePage: getActivePage(pageName) });
});

app.get("/blog-articles/:article", (request, response, next) => {
  const articleName = request.params.article;
  const validArticles = ["blog1", "blog2", "blog3", "blog4", "blog5"];

  if (!validArticles.includes(articleName)) {
    next();
    return;
  }

  response.render(`blog-articles/${articleName}`, { activePage: "blog" });
});

app.use((request, response) => {
  response.status(404).send("Page not found");
});

app.listen(PORT, () => {
  console.log(`BookNook is running at http://localhost:${PORT}`);
});
