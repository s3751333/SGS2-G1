const express = require("express");
const path = require("node:path");
const crypto = require("node:crypto");
const { users, blogPosts } = require("./data");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const sessions = {};
const blogCategories = ["programming", "mobile", "cloud", "cybersecurity"];
const blogImages = [
  "img/book.jpg",
  "img/mobileapp.jpg",
  "img/opensource.jpg",
  "img/cloudcomputing.jpg",
  "img/security.jpg",
];

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

function getBlogPostFromRoute(articleName) {
  const articleMatch = /^blog(\d+)$/.exec(articleName);

  if (!articleMatch) {
    return null;
  }

  const postId = Number(articleMatch[1]);
  return blogPosts.find((post) => post.id === postId) || null;
}

function getBlogFormData(body) {
  return {
    title: String(body.title || "").trim(),
    category: String(body.category || "").trim(),
    tags: String(body.tags || "").trim(),
    summary: String(body.summary || "").trim(),
    image: String(body.image || "").trim(),
    content: String(body.content || "").trim(),
  };
}

function validateBlogForm(formData) {
  const errors = {};
  const tags = formData.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (formData.title.length < 5 || formData.title.length > 100) {
    errors.title = "The title must contain between 5 and 100 characters.";
  }

  if (!blogCategories.includes(formData.category)) {
    errors.category = "Please select a valid category.";
  }

  if (tags.length === 0 || tags.length > 5 || tags.some((tag) => tag.length > 25)) {
    errors.tags = "Enter between 1 and 5 tags, with no more than 25 characters each.";
  }

  if (formData.summary.length < 20 || formData.summary.length > 250) {
    errors.summary = "The summary must contain between 20 and 250 characters.";
  }

  if (!blogImages.includes(formData.image)) {
    errors.image = "Please select a valid cover image.";
  }

  if (formData.content.length < 50 || formData.content.length > 5000) {
    errors.content = "The article must contain between 50 and 5000 characters.";
  }

  return { errors, tags };
}

function splitContentIntoParagraphs(content) {
  return content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function renderBlogForm(response, options) {
  response.status(options.status || 200).render("blog-create", {
    activePage: "blog",
    currentUser: options.currentUser,
    errors: options.errors || {},
    formAction: options.formAction,
    formData: options.formData || {},
    formMode: options.formMode,
    formTitle: options.formTitle,
    submitLabel: options.submitLabel,
  });
}

app.get("/blogs-data", (request, response) => {
  response.json(getBlogPostsWithAuthors());
});

const pageNames = [
  "admin-users",
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
    currentUser: getCurrentUser(request),
    posts: getBlogPostsWithAuthors(),
  });
});

app.get("/blog-create", (request, response) => {
  const currentUser = getCurrentUser(request);

  if (!currentUser) {
    response.redirect("/login");
    return;
  }

  renderBlogForm(response, {
    currentUser,
    formAction: "/blog-create",
    formData: {},
    formMode: "create",
    formTitle: "Create New Blog Post",
    submitLabel: "Publish Post",
  });
});

app.post("/blog-create", (request, response) => {
  const currentUser = getCurrentUser(request);

  if (!currentUser) {
    response.redirect("/login");
    return;
  }

  const formData = getBlogFormData(request.body);
  const { errors, tags } = validateBlogForm(formData);

  if (Object.keys(errors).length > 0) {
    renderBlogForm(response, {
      currentUser,
      errors,
      formAction: "/blog-create",
      formData,
      formMode: "create",
      formTitle: "Create New Blog Post",
      status: 400,
      submitLabel: "Publish Post",
    });
    return;
  }

  const newPostId = blogPosts.length > 0
    ? Math.max(...blogPosts.map((post) => post.id)) + 1
    : 1;

  blogPosts.push({
    id: newPostId,
    authorId: currentUser.id,
    title: formData.title,
    date: new Date().toISOString().slice(0, 10),
    category: formData.category,
    tags,
    summary: formData.summary,
    content: splitContentIntoParagraphs(formData.content),
    image: formData.image,
    comments: [],
  });

  response.redirect(`/blog-articles/blog${newPostId}`);
});

app.get("/blog-articles/:article/edit", (request, response, next) => {
  const post = getBlogPostFromRoute(request.params.article);

  if (!post) {
    next();
    return;
  }

  const currentUser = getCurrentUser(request);

  if (!currentUser) {
    response.redirect("/login");
    return;
  }

  if (post.authorId !== currentUser.id) {
    response.status(403).send("You can only edit your own blog posts.");
    return;
  }

  renderBlogForm(response, {
    currentUser,
    formAction: `/blog-articles/blog${post.id}/edit`,
    formData: {
      title: post.title,
      category: post.category,
      tags: post.tags.join(", "),
      summary: post.summary,
      image: post.image,
      content: post.content.join("\n\n"),
    },
    formMode: "edit",
    formTitle: "Edit Blog Post",
    submitLabel: "Save Changes",
  });
});

app.post("/blog-articles/:article/edit", (request, response, next) => {
  const post = getBlogPostFromRoute(request.params.article);

  if (!post) {
    next();
    return;
  }

  const currentUser = getCurrentUser(request);

  if (!currentUser) {
    response.redirect("/login");
    return;
  }

  if (post.authorId !== currentUser.id) {
    response.status(403).send("You can only edit your own blog posts.");
    return;
  }

  const formData = getBlogFormData(request.body);
  const { errors, tags } = validateBlogForm(formData);

  if (Object.keys(errors).length > 0) {
    renderBlogForm(response, {
      currentUser,
      errors,
      formAction: `/blog-articles/blog${post.id}/edit`,
      formData,
      formMode: "edit",
      formTitle: "Edit Blog Post",
      status: 400,
      submitLabel: "Save Changes",
    });
    return;
  }

  post.title = formData.title;
  post.category = formData.category;
  post.tags = tags;
  post.summary = formData.summary;
  post.image = formData.image;
  post.content = splitContentIntoParagraphs(formData.content);

  response.redirect(`/blog-articles/blog${post.id}`);
});

app.post("/blog-articles/:article/delete", (request, response, next) => {
  const post = getBlogPostFromRoute(request.params.article);

  if (!post) {
    next();
    return;
  }

  const currentUser = getCurrentUser(request);

  if (!currentUser) {
    response.redirect("/login");
    return;
  }

  if (post.authorId !== currentUser.id) {
    response.status(403).send("You can only delete your own blog posts.");
    return;
  }

  const postIndex = blogPosts.findIndex((item) => item.id === post.id);
  blogPosts.splice(postIndex, 1);
  response.redirect("/blogs");
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
  const articleMatch = /^blog(\d+)$/.exec(request.params.article);

  if (!articleMatch) {
    next();
    return;
  }

  const postId = Number(articleMatch[1]);
  const post = getBlogPostsWithAuthors().find((item) => item.id === postId);

  if (!post) {
    next();
    return;
  }

  response.render("blog-articles/article", {
    activePage: "blog",
    commentError: "",
    commentValue: "",
    currentUser: getCurrentUser(request),
    post,
  });
});

app.post("/blog-articles/:article/comments", (request, response, next) => {
  const articleMatch = /^blog(\d+)$/.exec(request.params.article);

  if (!articleMatch) {
    next();
    return;
  }

  const postId = Number(articleMatch[1]);
  const post = blogPosts.find((item) => item.id === postId);

  if (!post) {
    next();
    return;
  }

  const currentUser = getCurrentUser(request);

  if (!currentUser) {
    response.redirect("/login");
    return;
  }

  const commentText = String(request.body.comment || "").trim();

  if (commentText.length < 3 || commentText.length > 500) {
    const postWithAuthor = getBlogPostsWithAuthors().find((item) => item.id === postId);

    response.status(400).render("blog-articles/article", {
      activePage: "blog",
      commentError: "The comment must contain between 3 and 500 characters.",
      commentValue: commentText,
      currentUser,
      post: postWithAuthor,
    });
    return;
  }

  const nextCommentId = post.comments.length > 0
    ? Math.max(...post.comments.map((comment) => comment.id)) + 1
    : 1;

  post.comments.push({
    id: nextCommentId,
    author: currentUser.fullName,
    date: new Date().toISOString().slice(0, 10),
    text: commentText,
  });

  response.redirect(`/blog-articles/blog${post.id}#comments`);
});

app.use((request, response) => {
  response.status(404).send("Page not found");
});

app.listen(PORT, () => {
  console.log(`BookNook is running at http://localhost:${PORT}`);
});
