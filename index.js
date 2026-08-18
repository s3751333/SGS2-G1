const express = require("express");
const path = require("node:path");
const crypto = require("node:crypto");
const { users, blogPosts, forumTopics, forumReplies } = require("./data");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const sessions = {};
const passwordResetTokens = {};
const securityQuestions = [
  "What is your favourite animal?",
  "What is your favourite book?",
  "What is your favourite colour?",
];
const blogCategories = ["programming", "mobile", "cloud", "cybersecurity"];
const blogImages = [
  "img/book.jpg",
  "img/mobileapp.jpg",
  "img/opensource.jpg",
  "img/cloudcomputing.jpg",
  "img/security.jpg",
];
const forumCategories = {
  english: "English Books",
  vietnamese: "Vietnamese Books",
  "board-games": "Board Games",
};
const forumImages = [
  { value: "img/book.jpg", label: "Books" },
  { value: "img/little_prince.jpg", label: "The Little Prince" },
  { value: "img/eng_use.jpg", label: "English learning" },
  { value: "img/catan_bg.jpg", label: "Board games" },
];

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

function hashSecret(secret) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(secret, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function checkSecret(secret, storedHash) {
  if (typeof storedHash !== "string") return false;

  const [salt, savedHash] = storedHash.split(":");

  if (!salt || !savedHash) return false;

  try {
    const savedHashBuffer = Buffer.from(savedHash, "hex");
    const enteredHashBuffer = crypto.scryptSync(secret, salt, 64);

    return savedHashBuffer.length === enteredHashBuffer.length
      && crypto.timingSafeEqual(savedHashBuffer, enteredHashBuffer);
  } catch {
    return false;
  }
}

function normalizeSecurityAnswer(answer) {
  return String(answer || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
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
  const user = users.find((item) => item.id === userId);
  return user && user.status === "active" ? user : null;
}

function getSafeNextPage(value) {
  const nextPage = String(value || "");
  return nextPage.startsWith("/") && !nextPage.startsWith("//") ? nextPage : "/blogs";
}

app.use((request, response, next) => {
  response.locals.currentUser = getCurrentUser(request);
  next();
});

app.get("/login", (request, response) => {
  if (response.locals.currentUser) {
    response.redirect("/blogs");
    return;
  }

  response.render("login", {
    activePage: "",
    nextPage: getSafeNextPage(request.query.next),
  });
});

app.get("/register", (request, response) => {
  if (response.locals.currentUser) {
    response.redirect("/blogs");
    return;
  }

  response.render("register", {
    activePage: "",
    securityQuestions,
  });
});

app.get("/forgot-password", (request, response) => {
  response.render("forgot-password", {
    activePage: "",
    securityQuestions,
  });
});

app.post("/forgot-password", (request, response) => {
  const email = String(request.body.email || "").trim().toLowerCase();
  const answers = [
    request.body.securityAnswer1,
    request.body.securityAnswer2,
    request.body.securityAnswer3,
  ].map(normalizeSecurityAnswer);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ message: "Enter a valid email address." });
    return;
  }

  if (answers.some((answer) => answer.length < 2 || answer.length > 80)) {
    response.status(400).json({ message: "Answer all three security questions." });
    return;
  }

  const user = users.find((item) => item.email === email);

  const answersAreCorrect = user
    && Array.isArray(user.securityAnswerHashes)
    && user.securityAnswerHashes.length === answers.length
    && answers.every((answer, index) => checkSecret(answer, user.securityAnswerHashes[index]));

  if (!answersAreCorrect) {
    response.status(401).json({ message: "The email or security answers are incorrect." });
    return;
  }

  const token = crypto.randomBytes(24).toString("hex");
  passwordResetTokens[token] = {
    expiresAt: Date.now() + 15 * 60 * 1000,
    userId: user.id,
  };

  response.json({
    message: "Your answers are correct. You can now choose a new password.",
    redirectTo: `/reset-password?token=${token}`,
  });
});

app.get("/reset-password", (request, response) => {
  const token = String(request.query.token || "");
  const resetRequest = passwordResetTokens[token];
  const tokenIsValid = resetRequest && resetRequest.expiresAt > Date.now();

  if (!tokenIsValid) {
    delete passwordResetTokens[token];
  }

  response.render("reset-password", {
    activePage: "",
    token,
    tokenIsValid,
  });
});

app.post("/reset-password", (request, response) => {
  const token = String(request.body.token || "");
  const password = String(request.body.password || "");
  const confirmPassword = String(request.body.confirmPassword || "");
  const resetRequest = passwordResetTokens[token];

  if (!resetRequest || resetRequest.expiresAt <= Date.now()) {
    delete passwordResetTokens[token];
    response.status(400).json({ message: "This password reset session is invalid or has expired." });
    return;
  }

  if (password.length < 8 || password.length > 72 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    response.status(400).json({ message: "Use 8 characters, a capital letter, and a number." });
    return;
  }

  if (password !== confirmPassword) {
    response.status(400).json({ message: "The passwords do not match." });
    return;
  }

  const user = users.find((item) => item.id === resetRequest.userId);

  if (!user) {
    delete passwordResetTokens[token];
    response.status(404).json({ message: "The user account no longer exists." });
    return;
  }

  user.passwordHash = hashSecret(password);
  delete passwordResetTokens[token];

  Object.keys(sessions).forEach((sessionId) => {
    if (sessions[sessionId] === user.id) {
      delete sessions[sessionId];
    }
  });

  response.json({
    message: "Password changed successfully.",
    redirectTo: "/login",
  });
});

app.post("/register", (request, response) => {
  const fullName = String(request.body.fullName || "").trim();
  const username = String(request.body.username || "").trim();
  const email = String(request.body.email || "").trim().toLowerCase();
  const introduction = String(request.body.introduction || "").trim();
  const password = String(request.body.password || "");
  const confirmPassword = String(request.body.confirmPassword || "");
  const securityAnswers = [
    request.body.securityAnswer1,
    request.body.securityAnswer2,
    request.body.securityAnswer3,
  ].map(normalizeSecurityAnswer);

  if (fullName.length < 2 || fullName.length > 80) {
    response.status(400).json({ message: "The full name must contain between 2 and 80 characters." });
    return;
  }

  if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
    response.status(400).json({ message: "The username is not valid." });
    return;
  }

  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ message: "The email address is not valid." });
    return;
  }

  if (introduction.length > 300) {
    response.status(400).json({ message: "The introduction cannot exceed 300 characters." });
    return;
  }

  if (password.length < 8 || password.length > 72 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    response.status(400).json({ message: "The password is not valid." });
    return;
  }

  if (password !== confirmPassword) {
    response.status(400).json({ message: "The passwords do not match." });
    return;
  }

  if (securityAnswers.some((answer) => answer.length < 2 || answer.length > 80)) {
    response.status(400).json({ message: "Each security answer must contain between 2 and 80 characters." });
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
    passwordHash: hashSecret(password),
    securityAnswerHashes: securityAnswers.map((answer) => hashSecret(answer)),
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

  if (!user || !checkSecret(password, user.passwordHash)) {
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
    redirectTo: getSafeNextPage(request.body.next),
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

function requireLogin(request, response, next) {
  const currentUser = getCurrentUser(request);

  if (!currentUser) {
    response.redirect(`/login?next=${encodeURIComponent(request.originalUrl)}`);
    return;
  }

  request.currentUser = currentUser;
  next();
}

function requireAdmin(request, response, next) {
  const currentUser = getCurrentUser(request);

  if (!currentUser) {
    response.redirect(`/login?next=${encodeURIComponent(request.originalUrl)}`);
    return;
  }

  if (currentUser.role !== "admin") {
    response.status(403).send("Administrator access is required.");
    return;
  }

  request.currentUser = currentUser;
  next();
}

function findForumTopic(topicId) {
  return forumTopics.find((topic) => topic.id === Number(topicId) && !topic.deleted) || null;
}

function findForumReply(replyId) {
  return forumReplies.find((reply) => reply.id === Number(replyId) && !reply.deleted) || null;
}

function getNextId(records) {
  return records.length > 0 ? Math.max(...records.map((record) => record.id)) + 1 : 1;
}

function getForumFormData(body) {
  return {
    category: String(body.category || "").trim(),
    title: String(body.title || "").trim(),
    content: String(body.content || "").trim(),
    image: String(body.image || "").trim(),
  };
}

function validateForumPost(formData) {
  const errors = {};

  if (!forumCategories[formData.category]) {
    errors.category = "Please select a valid category.";
  }

  if (formData.title.length < 5 || formData.title.length > 100) {
    errors.title = "The title must contain between 5 and 100 characters.";
  }

  if (formData.content.length < 20 || formData.content.length > 2000) {
    errors.content = "The message must contain between 20 and 2000 characters.";
  }

  if (!forumImages.some((image) => image.value === formData.image)) {
    errors.image = "Please select a valid image.";
  }

  return errors;
}

function getReplyFormData(body) {
  const parentReplyId = String(body.parentReplyId || "").trim();

  return {
    title: String(body.title || "").trim(),
    content: String(body.content || "").trim(),
    image: String(body.image || "").trim(),
    parentReplyId: parentReplyId ? Number(parentReplyId) : null,
    parentReplyIdIsValid: !parentReplyId || /^\d+$/.test(parentReplyId),
  };
}

function validateForumReply(formData, topicId) {
  const errors = {};

  if (formData.title.length < 3 || formData.title.length > 100) {
    errors.title = "The reply title must contain between 3 and 100 characters.";
  }

  if (formData.content.length < 3 || formData.content.length > 1000) {
    errors.content = "The reply must contain between 3 and 1000 characters.";
  }

  if (!forumImages.some((image) => image.value === formData.image)) {
    errors.image = "Please select a valid image.";
  }

  if (!formData.parentReplyIdIsValid || (formData.parentReplyId !== null && formData.parentReplyId < 1)) {
    errors.parentReplyId = "The selected parent reply is not valid.";
  } else if (formData.parentReplyId !== null) {
    const parentReply = findForumReply(formData.parentReplyId);

    if (!parentReply || parentReply.topicId !== Number(topicId)) {
      errors.parentReplyId = "The selected parent reply is not valid.";
    }
  }

  return errors;
}

function formatForumDate(value) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Melbourne",
  }).format(new Date(value));
}

function getForumTopicView(topic) {
  const replies = forumReplies.filter((reply) => reply.topicId === topic.id && !reply.deleted);
  const lastActivity = replies.reduce(
    (latest, reply) => reply.createdAt > latest ? reply.createdAt : latest,
    topic.createdAt,
  );
  const author = users.find((user) => user.id === topic.authorId);
  const replySearchText = replies.map((reply) => {
    const replyAuthor = users.find((user) => user.id === reply.authorId);
    return [reply.title, reply.content, replyAuthor ? replyAuthor.fullName : ""].join(" ");
  }).join(" ");

  return {
    ...topic,
    author: author ? author.fullName : "Unknown user",
    categoryLabel: forumCategories[topic.category],
    createdLabel: formatForumDate(topic.createdAt),
    lastActivity,
    replyCount: replies.length,
    searchText: [topic.title, topic.content, author ? author.fullName : "", forumCategories[topic.category], replySearchText]
      .join(" ")
      .toLowerCase(),
  };
}

function getForumReplyView(reply) {
  const author = users.find((user) => user.id === reply.authorId);
  const parentReply = reply.parentReplyId ? findForumReply(reply.parentReplyId) : null;
  const parentAuthor = parentReply
    ? users.find((user) => user.id === parentReply.authorId)
    : null;

  return {
    ...reply,
    author: author ? author.fullName : "Unknown user",
    createdLabel: formatForumDate(reply.createdAt),
    parentAuthor: parentAuthor ? parentAuthor.fullName : "",
  };
}

function getForumReplyViews(topicId) {
  const replies = forumReplies.filter((reply) => reply.topicId === topicId && !reply.deleted);
  const replyIds = new Set(replies.map((reply) => reply.id));
  const repliesByParent = new Map();

  replies.forEach((reply) => {
    const parentId = replyIds.has(reply.parentReplyId) ? reply.parentReplyId : null;
    const siblings = repliesByParent.get(parentId) || [];
    siblings.push(reply);
    repliesByParent.set(parentId, siblings);
  });

  const orderedReplies = [];
  function addReplies(parentId, depth) {
    const children = repliesByParent.get(parentId) || [];
    children
      .sort((replyA, replyB) => replyA.createdAt.localeCompare(replyB.createdAt))
      .forEach((reply) => {
        orderedReplies.push({ ...getForumReplyView(reply), depth });
        addReplies(reply.id, depth + 1);
      });
  }

  addReplies(null, 0);
  return orderedReplies;
}

function renderTopicForm(response, options) {
  response.status(options.status || 200).render("forum-new-topic", {
    activePage: "forum",
    errors: options.errors || {},
    formAction: options.formAction,
    formData: options.formData || {},
    formMode: options.formMode,
    forumCategories,
    forumImages,
    pageTitle: options.pageTitle,
    submitLabel: options.submitLabel,
  });
}

function renderForumTopic(response, topic, options = {}) {
  const replies = getForumReplyViews(topic.id);

  response.status(options.status || 200).render("forum-topic", {
    activePage: "forum",
    currentUser: response.locals.currentUser,
    errors: options.errors || {},
    formData: options.formData || {},
    forumImages,
    replies,
    topic: getForumTopicView(topic),
  });
}

app.get("/blogs-data", (request, response) => {
  response.json(getBlogPostsWithAuthors());
});

app.get("/forum-main", (request, response) => {
  response.render("forum-main", {
    activePage: "forum",
    currentUser: getCurrentUser(request),
    forumCategories,
    topics: forumTopics.filter((topic) => !topic.deleted).map(getForumTopicView),
  });
});

app.get("/forum-new-topic", requireLogin, (request, response) => {
  renderTopicForm(response, {
    formAction: "/forum-new-topic",
    formMode: "create",
    pageTitle: "Start a new discussion",
    submitLabel: "Publish discussion",
  });
});

app.post("/forum-new-topic", requireLogin, (request, response) => {
  const formData = getForumFormData(request.body);
  const errors = validateForumPost(formData);

  if (Object.keys(errors).length > 0) {
    renderTopicForm(response, {
      errors,
      formAction: "/forum-new-topic",
      formData,
      formMode: "create",
      pageTitle: "Start a new discussion",
      status: 400,
      submitLabel: "Publish discussion",
    });
    return;
  }

  const topic = {
    id: getNextId(forumTopics),
    authorId: request.currentUser.id,
    category: formData.category,
    title: formData.title,
    content: formData.content,
    image: formData.image,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 0,
    deleted: false,
  };

  forumTopics.push(topic);
  response.redirect(`/forum-topic/${topic.id}`);
});

app.get("/forum-topic/:topicId", (request, response, next) => {
  const topic = findForumTopic(request.params.topicId);

  if (!topic) {
    next();
    return;
  }

  topic.views += 1;
  renderForumTopic(response, topic);
});

app.post("/forum-topic/:topicId/replies", requireLogin, (request, response, next) => {
  const topic = findForumTopic(request.params.topicId);

  if (!topic) {
    next();
    return;
  }

  const formData = getReplyFormData(request.body);
  const errors = validateForumReply(formData, topic.id);

  if (Object.keys(errors).length > 0) {
    renderForumTopic(response, topic, { errors, formData, status: 400 });
    return;
  }

  forumReplies.push({
    id: getNextId(forumReplies),
    topicId: topic.id,
    parentReplyId: formData.parentReplyId,
    authorId: request.currentUser.id,
    title: formData.title,
    content: formData.content,
    image: formData.image,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
  });

  response.redirect(`/forum-topic/${topic.id}#replies`);
});

app.get("/forum-topic/:topicId/edit", requireLogin, (request, response, next) => {
  const topic = findForumTopic(request.params.topicId);

  if (!topic) {
    next();
    return;
  }

  if (topic.authorId !== request.currentUser.id) {
    response.status(403).send("You can only edit your own discussion.");
    return;
  }

  renderTopicForm(response, {
    formAction: `/forum-topic/${topic.id}/edit`,
    formData: topic,
    formMode: "edit",
    pageTitle: "Edit discussion",
    submitLabel: "Save changes",
  });
});

app.post("/forum-topic/:topicId/edit", requireLogin, (request, response, next) => {
  const topic = findForumTopic(request.params.topicId);

  if (!topic) {
    next();
    return;
  }

  if (topic.authorId !== request.currentUser.id) {
    response.status(403).send("You can only edit your own discussion.");
    return;
  }

  const formData = getForumFormData(request.body);
  const errors = validateForumPost(formData);

  if (Object.keys(errors).length > 0) {
    renderTopicForm(response, {
      errors,
      formAction: `/forum-topic/${topic.id}/edit`,
      formData,
      formMode: "edit",
      pageTitle: "Edit discussion",
      status: 400,
      submitLabel: "Save changes",
    });
    return;
  }

  topic.category = formData.category;
  topic.title = formData.title;
  topic.content = formData.content;
  topic.image = formData.image;
  topic.updatedAt = new Date().toISOString();
  response.redirect(`/forum-topic/${topic.id}`);
});

app.post("/forum-topic/:topicId/delete", requireLogin, (request, response, next) => {
  const topic = findForumTopic(request.params.topicId);

  if (!topic) {
    next();
    return;
  }

  if (topic.authorId !== request.currentUser.id) {
    response.status(403).send("You can only delete your own discussion.");
    return;
  }

  topic.deleted = true;
  topic.updatedAt = new Date().toISOString();
  response.redirect("/forum-main");
});

app.get("/forum-topic/:topicId/replies/:replyId/edit", requireLogin, (request, response, next) => {
  const topic = findForumTopic(request.params.topicId);
  const reply = findForumReply(request.params.replyId);

  if (!topic || !reply || reply.topicId !== topic.id) {
    next();
    return;
  }

  if (reply.authorId !== request.currentUser.id) {
    response.status(403).send("You can only edit your own reply.");
    return;
  }

  response.render("forum-edit-reply", {
    activePage: "forum",
    errors: {},
    formData: reply,
    forumImages,
    topic: getForumTopicView(topic),
  });
});

app.post("/forum-topic/:topicId/replies/:replyId/edit", requireLogin, (request, response, next) => {
  const topic = findForumTopic(request.params.topicId);
  const reply = findForumReply(request.params.replyId);

  if (!topic || !reply || reply.topicId !== topic.id) {
    next();
    return;
  }

  if (reply.authorId !== request.currentUser.id) {
    response.status(403).send("You can only edit your own reply.");
    return;
  }

  const formData = getReplyFormData(request.body);
  // The parent cannot be changed from the edit form, so validate only editable fields.
  formData.parentReplyId = null;
  formData.parentReplyIdIsValid = true;
  const errors = validateForumReply(formData, topic.id);

  if (Object.keys(errors).length > 0) {
    response.status(400).render("forum-edit-reply", {
      activePage: "forum",
      errors,
      formData: { ...formData, id: reply.id },
      forumImages,
      topic: getForumTopicView(topic),
    });
    return;
  }

  reply.title = formData.title;
  reply.content = formData.content;
  reply.image = formData.image;
  reply.updatedAt = new Date().toISOString();
  response.redirect(`/forum-topic/${topic.id}#reply-${reply.id}`);
});

app.post("/forum-topic/:topicId/replies/:replyId/delete", requireLogin, (request, response, next) => {
  const topic = findForumTopic(request.params.topicId);
  const reply = findForumReply(request.params.replyId);

  if (!topic || !reply || reply.topicId !== topic.id) {
    next();
    return;
  }

  if (reply.authorId !== request.currentUser.id) {
    response.status(403).send("You can only delete your own reply.");
    return;
  }

  reply.deleted = true;
  reply.updatedAt = new Date().toISOString();
  response.redirect(`/forum-topic/${topic.id}#replies`);
});

app.get("/admin-users", requireAdmin, (request, response) => {
  response.render("admin-users", {
    activePage: "",
    currentUser: request.currentUser,
    users,
  });
});

app.post("/admin-users/:userId/status", requireAdmin, (request, response) => {
  const user = users.find((item) => item.id === Number(request.params.userId));
  const status = String(request.body.status || "");

  if (!user) {
    response.status(404).json({ message: "User not found." });
    return;
  }

  if (user.id === request.currentUser.id) {
    response.status(400).json({ message: "You cannot lock your own account." });
    return;
  }

  if (!["active", "locked"].includes(status)) {
    response.status(400).json({ message: "Please select a valid account status." });
    return;
  }

  user.status = status;

  if (status === "locked") {
    Object.entries(sessions).forEach(([sessionId, userId]) => {
      if (userId === user.id) delete sessions[sessionId];
    });
  }

  response.json({
    message: `${user.fullName} is now ${status === "active" ? "enabled" : "disabled"}.`,
    status: user.status,
  });
});

const pageNames = [
  "cart",
  "checkout",
  "product-detail",
  "products",
  "profile",
  "wishlist",
];

function getActivePage(pageName) {
  if (pageName.includes("blog")) return "blog";
  if (pageName.includes("product")) return "shop";
  if (pageName.includes("forum")) return "forum";
  return "";
}

function getSitemapSections(currentUser) {
  const sections = [
    {
      id: "main-navigation",
      title: "Main Navigation",
      icon: "fas fa-compass",
      links: [
        { url: "/", label: "Home Page" },
        { url: "/products", label: "Products" },
        { url: "/blogs", label: "Blog" },
        { url: "/forum-main", label: "Community Forum" },
      ],
    },
    {
      id: "shopping",
      title: "Shopping and Saved Items",
      icon: "fas fa-shopping-bag",
      links: [
        { url: "/product-detail", label: "Product Details" },
        { url: "/cart", label: "Shopping Cart" },
        { url: "/checkout", label: "Checkout" },
        { url: "/wishlist", label: "Wishlist" },
      ],
    },
    {
      id: "account-access",
      title: "Account Access",
      icon: "fas fa-user",
      links: [
        { url: "/login", label: "Sign In" },
        { url: "/register", label: "Create Account" },
        { url: "/forgot-password", label: "Forgot Password" }
      ],
    },
    {
      id: "blog-articles",
      title: "Blog Articles",
      icon: "fas fa-newspaper",
      links: [
        { url: "/blogs", label: "All Blog Articles" },
        ...getBlogPostsWithAuthors().map((post) => ({
          url: `/blog-articles/blog${post.id}`,
          label: post.title,
        })),
      ],
    },
    {
      id: "forum-topics",
      title: "Discussion Topics",
      icon: "fas fa-comments",
      links: [
        { url: "/forum-main", label: "All Discussion Topics" },
        { url: "/forum-new-topic", label: "Create a Discussion Topic" },
        ...forumTopics
          .filter((topic) => !topic.deleted)
          .map((topic) => ({
            url: `/forum-topic/${topic.id}`,
            label: topic.title,
          })),
      ],
    },
  ];

  if (currentUser && currentUser.role === "admin") {
    sections.push({
      id: "administration",
      title: "Administration",
      icon: "fas fa-user-shield",
      links: [{ url: "/admin-users", label: "Manage User Accounts" }],
    });
  }

  return sections;
}

app.get("/sitemap", (request, response) => {
  response.render("sitemap", {
    activePage: "",
    sitemapSections: getSitemapSections(getCurrentUser(request)),
  });
});

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
    response.redirect("/login?next=%2Fblog-create");
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
    response.redirect("/login?next=%2Fblog-create");
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
    response.redirect(`/login?next=${encodeURIComponent(`/blog-articles/blog${post.id}/edit`)}`);
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
    response.redirect(`/login?next=${encodeURIComponent(`/blog-articles/blog${post.id}/edit`)}`);
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
    response.redirect(`/login?next=${encodeURIComponent(`/blog-articles/blog${post.id}`)}`);
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
    response.redirect(`/login?next=${encodeURIComponent(`/blog-articles/blog${post.id}`)}`);
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
