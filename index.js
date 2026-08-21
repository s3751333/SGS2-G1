const express = require("express");
const path = require("node:path");
const crypto = require("node:crypto");
const {
  users,
  blogPosts,
  forumTopics,
  forumReplies,
  products,
  reviews,
  wishlistItems,
  getNextReviewId,
  getNextWishlistItemId,
} = require("./data");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const sessions = {};
const passwordResetTokens = {};
const cartsByUserId = new Map();
const orders = [];
const MAX_CART_QUANTITY = 99;
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

function getUserCart(userId) {
  if (!cartsByUserId.has(userId)) cartsByUserId.set(userId, []);
  return cartsByUserId.get(userId);
}

function serializeCart(userId) {
  const items = getUserCart(userId)
    .map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      return product ? { ...item, product, lineTotal: product.price * item.quantity } : null;
    })
    .filter(Boolean);
  const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);

  return {
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal,
    shipping: 0,
    total: subtotal,
  };
}

function getCheckoutData(body) {
  return {
    customer: {
      fullName: String(body.customer?.fullName || body.fullName || "").trim(),
      email: String(body.customer?.email || body.email || "").trim().toLowerCase(),
      phone: String(body.customer?.phone || body.phone || "").trim(),
      address: String(body.customer?.address || body.address || "").trim(),
      city: String(body.customer?.city || body.city || "").trim(),
      district: String(body.customer?.district || body.district || "").trim(),
      note: String(body.customer?.note || body.note || "").trim(),
    },
    payment: String(body.payment || "").trim(),
  };
}

function validateCheckout(data) {
  const errors = {};
  const { customer, payment } = data;
  const phoneDigits = customer.phone.replace(/\D/g, "");

  if (customer.fullName.length < 2 || customer.fullName.length > 80) errors.fullName = "Full name must contain between 2 and 80 characters.";
  if (customer.email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.email = "Enter a valid email address.";
  if (!/^\+?[0-9 ]+$/.test(customer.phone) || phoneDigits.length < 9 || phoneDigits.length > 15) errors.phone = "Phone number must contain 9 to 15 digits; spaces and + are allowed.";
  if (customer.address.length < 5 || customer.address.length > 150) errors.address = "Address must contain between 5 and 150 characters.";
  if (customer.city.length < 2 || customer.city.length > 60) errors.city = "City / Province must contain between 2 and 60 characters.";
  if (customer.district.length < 2 || customer.district.length > 60) errors.district = "District must contain between 2 and 60 characters.";
  if (customer.note.length > 300) errors.note = "Order note cannot exceed 300 characters.";
  if (!["cod", "bank"].includes(payment)) errors.payment = "Select a valid payment method.";
  return errors;
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

function requireApiLogin(request, response, next) {
  const currentUser = getCurrentUser(request);

  if (!currentUser) {
    response.status(401).json({ message: "Please sign in to manage your cart and orders." });
    return;
  }

  request.currentUser = currentUser;
  next();
}

function getValidQuantity(value) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_CART_QUANTITY
    ? quantity
    : null;
}

function getPublicOrder(order) {
  const { userId, ...publicOrder } = order;
  return publicOrder;
}

app.get("/api/cart", requireApiLogin, (request, response) => {
  response.json(serializeCart(request.currentUser.id));
});

app.post("/api/cart/items", requireApiLogin, (request, response) => {
  const productId = String(request.body.productId || "");
  const quantity = getValidQuantity(request.body.quantity);
  const product = products.find((item) => item.id === productId);

  if (!product) {
    response.status(404).json({ message: "Product not found." });
    return;
  }
  if (quantity === null) {
    response.status(400).json({ message: `Quantity must be a whole number between 1 and ${MAX_CART_QUANTITY}.` });
    return;
  }

  const cart = getUserCart(request.currentUser.id);
  const existingItem = cart.find((item) => item.productId === productId);
  const nextQuantity = (existingItem?.quantity || 0) + quantity;
  const allowedQuantity = Math.min(MAX_CART_QUANTITY, Math.max(0, Number(product.stock) || 0));

  if (nextQuantity > allowedQuantity) {
    response.status(409).json({ message: `Only ${allowedQuantity} unit(s) of ${product.name} are available.` });
    return;
  }

  if (existingItem) existingItem.quantity = nextQuantity;
  else cart.push({ productId, quantity });
  response.status(201).json(serializeCart(request.currentUser.id));
});

app.patch("/api/cart/items/:productId", requireApiLogin, (request, response) => {
  const cart = getUserCart(request.currentUser.id);
  const item = cart.find((entry) => entry.productId === request.params.productId);
  const quantity = getValidQuantity(request.body.quantity);
  const product = products.find((entry) => entry.id === request.params.productId);

  if (!item || !product) {
    response.status(404).json({ message: "This product is not in your cart." });
    return;
  }
  if (quantity === null) {
    response.status(400).json({ message: `Quantity must be a whole number between 1 and ${MAX_CART_QUANTITY}.` });
    return;
  }
  if (quantity > product.stock) {
    response.status(409).json({ message: `Only ${product.stock} unit(s) of ${product.name} are available.` });
    return;
  }

  item.quantity = quantity;
  response.json(serializeCart(request.currentUser.id));
});

app.delete("/api/cart/items/:productId", requireApiLogin, (request, response) => {
  const cart = getUserCart(request.currentUser.id);
  const itemIndex = cart.findIndex((item) => item.productId === request.params.productId);

  if (itemIndex === -1) {
    response.status(404).json({ message: "This product is not in your cart." });
    return;
  }

  cart.splice(itemIndex, 1);
  response.json(serializeCart(request.currentUser.id));
});

app.delete("/api/cart", requireApiLogin, (request, response) => {
  cartsByUserId.set(request.currentUser.id, []);
  response.json(serializeCart(request.currentUser.id));
});

app.get("/api/orders", requireApiLogin, (request, response) => {
  response.json({
    orders: orders
      .filter((order) => order.userId === request.currentUser.id)
      .map(getPublicOrder),
  });
});

app.get("/api/orders/:orderId", requireApiLogin, (request, response) => {
  const order = orders.find((item) => item.id === request.params.orderId && item.userId === request.currentUser.id);

  if (!order) {
    response.status(404).json({ message: "Order not found." });
    return;
  }

  response.json({ order: getPublicOrder(order) });
});

function createOrder(request, response) {
  const cart = serializeCart(request.currentUser.id);

  if (!cart.items.length) {
    response.status(400).json({ message: "Your cart is empty." });
    return;
  }

  const unavailableItem = cart.items.find(({ product, quantity }) => quantity > product.stock);
  if (unavailableItem) {
    response.status(409).json({
      message: `Only ${unavailableItem.product.stock} unit(s) of ${unavailableItem.product.name} are available.`,
    });
    return;
  }

  const checkoutData = getCheckoutData(request.body);
  const errors = validateCheckout(checkoutData);

  if (Object.keys(errors).length) {
    response.status(400).json({ message: "Please correct the checkout information.", errors });
    return;
  }

  const order = {
    id: `BN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    userId: request.currentUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customer: checkoutData.customer,
    payment: checkoutData.payment,
    items: cart.items.map(({ product, quantity, lineTotal }) => ({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      lineTotal,
    })),
    subtotal: cart.subtotal,
    shipping: cart.shipping,
    total: cart.total,
    status: "confirmed",
  };

  orders.push(order);
  cartsByUserId.set(request.currentUser.id, []);
  response.status(201).json({ order: getPublicOrder(order) });
}

app.post("/api/orders", requireApiLogin, createOrder);
app.post("/checkout", requireApiLogin, createOrder);

app.patch("/api/orders/:orderId", requireApiLogin, (request, response) => {
  const order = orders.find((item) => item.id === request.params.orderId && item.userId === request.currentUser.id);

  if (!order) {
    response.status(404).json({ message: "Order not found." });
    return;
  }
  if (order.status !== "confirmed") {
    response.status(409).json({ message: "Only confirmed orders can be updated." });
    return;
  }

  const checkoutData = getCheckoutData({
    customer: { ...order.customer, ...(request.body.customer || {}) },
    payment: request.body.payment ?? order.payment,
  });
  const errors = validateCheckout(checkoutData);

  if (Object.keys(errors).length) {
    response.status(400).json({ message: "Please correct the order information.", errors });
    return;
  }

  order.customer = checkoutData.customer;
  order.payment = checkoutData.payment;
  order.updatedAt = new Date().toISOString();
  response.json({ order: getPublicOrder(order) });
});

app.delete("/api/orders/:orderId", requireApiLogin, (request, response) => {
  const orderIndex = orders.findIndex(
    (item) => item.id === request.params.orderId && item.userId === request.currentUser.id,
  );

  if (orderIndex === -1) {
    response.status(404).json({ message: "Order not found." });
    return;
  }

  orders.splice(orderIndex, 1);
  response.status(204).end();
});

// ---------------------------------------------------------------------------
// Product, Review, Wishlist, and Profile module (Khoa Pham Dang Nguyen)
// ---------------------------------------------------------------------------

const productCategories = ["fiction", "reference", "self-help", "board-games"];

function getProductById(productId) {
  return products.find((product) => product.id === productId) || null;
}

function getReviewsForProduct(productId) {
  return reviews.filter((review) => review.productId === productId);
}

function getRatingSummary(productId) {
  const productReviews = getReviewsForProduct(productId);
  const count = productReviews.length;

  const breakdown = [5, 4, 3, 2, 1].map((stars) => {
    const starCount = productReviews.filter((review) => review.rating === stars).length;
    return {
      stars,
      count: starCount,
      percent: count > 0 ? Math.round((starCount / count) * 100) : 0,
    };
  });

  const average = count > 0
    ? productReviews.reduce((total, review) => total + review.rating, 0) / count
    : 0;

  return { average: Math.round(average * 10) / 10, count, breakdown };
}

function sortReviews(productReviews, sortKey) {
  const sorted = [...productReviews];

  if (sortKey === "helpful") {
    sorted.sort((a, b) => b.helpfulCount - a.helpfulCount || new Date(b.createdAt) - new Date(a.createdAt));
  } else {
    sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return sorted;
}

function getReviewFormErrors(body) {
  const errors = {};
  const rating = Number(body.rating);
  const title = String(body.title || "").trim();
  const reviewBody = String(body.body || "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = "Please select a star rating between 1 and 5.";
  }

  if (title.length < 3 || title.length > 120) {
    errors.title = "Review title must be between 3 and 120 characters.";
  }

  if (reviewBody.length < 10 || reviewBody.length > 1000) {
    errors.body = "Review must be between 10 and 1000 characters.";
  }

  return { errors, rating, title, body: reviewBody };
}

function matchesProductSearch(product, query) {
  if (!query) return true;
  const haystack = `${product.name} ${product.meta} ${product.tag} ${product.category}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function sortProducts(productList, sortKey) {
  const sorted = [...productList];

  if (sortKey === "price-low") {
    sorted.sort((a, b) => a.price - b.price);
  } else if (sortKey === "price-high") {
    sorted.sort((a, b) => b.price - a.price);
  } else if (sortKey === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortKey === "rating") {
    sorted.sort((a, b) => getRatingSummary(b.id).average - getRatingSummary(a.id).average);
  }

  return sorted;
}

function getWishlistForUser(userId) {
  return wishlistItems
    .filter((item) => item.userId === userId)
    .map((item) => ({ ...item, product: getProductById(item.productId) }))
    .filter((item) => item.product !== null);
}

function countOtherCollectors(productId, currentUserId) {
  return wishlistItems.filter(
    (item) => item.productId === productId && item.userId !== currentUserId,
  ).length;
}

function sortWishlist(items, sortKey) {
  const sorted = [...items];

  if (sortKey === "price-low") {
    sorted.sort((a, b) => a.product.price - b.product.price);
  } else if (sortKey === "price-high") {
    sorted.sort((a, b) => b.product.price - a.product.price);
  } else if (sortKey === "name") {
    sorted.sort((a, b) => a.product.name.localeCompare(b.product.name));
  } else {
    sorted.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  }

  return sorted;
}

const avatarColors = ["#0d6efd", "#d63659", "#218739", "#f5a623", "#7c3aed", "#0891b2"];

function getProfileFormErrors(body) {
  const errors = {};
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const introduction = String(body.introduction || "").trim();
  const avatarColor = avatarColors.includes(body.avatarColor) ? body.avatarColor : avatarColors[0];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (fullName.length < 2 || fullName.length > 80) {
    errors.fullName = "Full name must be between 2 and 80 characters.";
  }

  if (!emailPattern.test(email)) {
    errors.email = "Please enter a valid email address.";
  } else if (users.some((user) => user.email === email && user.id !== Number(body.userId))) {
    errors.email = "That email address is already in use by another account.";
  }

  if (introduction.length > 300) {
    errors.introduction = "Introduction must be 300 characters or fewer.";
  }

  return { errors, fullName, email, introduction, avatarColor };
}

function getPasswordChangeErrors(body, currentUser) {
  const errors = {};
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!checkSecret(currentPassword, currentUser.passwordHash)) {
    errors.currentPassword = "Current password is incorrect.";
  }

  if (newPassword.length < 8) {
    errors.newPassword = "New password must be at least 8 characters.";
  }

  if (newPassword !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return { errors, newPassword };
}

app.get("/products", (request, response) => {
  const query = String(request.query.q || "").trim();
  const category = String(request.query.category || "all");
  const sort = String(request.query.sort || "recent");

  const filtered = products
    .filter((product) => category === "all" || product.category === category)
    .filter((product) => matchesProductSearch(product, query));

  const sorted = sortProducts(filtered, sort);

  response.render("products", {
    activePage: "shop",
    currentUser: getCurrentUser(request),
    products: sorted.map((product) => ({ ...product, rating: getRatingSummary(product.id) })),
    productCategories,
    query,
    category,
    sort,
    resultCount: sorted.length,
  });
});

app.get("/product-detail/:id", (request, response, next) => {
  const product = getProductById(request.params.id);

  if (!product) {
    next();
    return;
  }

  const currentUser = getCurrentUser(request);
  const sort = String(request.query.sort || "recent");
  const productReviews = sortReviews(getReviewsForProduct(product.id), sort)
    .map((review) => ({ ...review, isOwnReview: currentUser ? review.userId === currentUser.id : false }));

  const wishlistEntry = currentUser
    ? wishlistItems.find((item) => item.userId === currentUser.id && item.productId === product.id)
    : null;

  response.render("product-detail", {
    activePage: "shop",
    currentUser,
    product,
    reviews: productReviews,
    rating: getRatingSummary(product.id),
    reviewSort: sort,
    isInWishlist: Boolean(wishlistEntry),
    reviewErrors: {},
    reviewFormData: { rating: "", title: "", body: "" },
  });
});

app.post("/product-detail/:id/reviews", requireLogin, (request, response, next) => {
  const product = getProductById(request.params.id);

  if (!product) {
    next();
    return;
  }

  const alreadyReviewed = reviews.some(
    (review) => review.productId === product.id && review.userId === request.currentUser.id,
  );

  const { errors, rating, title, body } = getReviewFormErrors(request.body);

  if (alreadyReviewed) {
    errors.duplicate = "You have already reviewed this product. Delete your existing review to write a new one.";
  }

  if (Object.keys(errors).length > 0) {
    const productReviews = sortReviews(getReviewsForProduct(product.id), "recent")
      .map((review) => ({ ...review, isOwnReview: review.userId === request.currentUser.id }));

    const wishlistEntry = wishlistItems.find(
      (item) => item.userId === request.currentUser.id && item.productId === product.id,
    );

    response.status(400).render("product-detail", {
      activePage: "shop",
      currentUser: request.currentUser,
      product,
      reviews: productReviews,
      rating: getRatingSummary(product.id),
      reviewSort: "recent",
      isInWishlist: Boolean(wishlistEntry),
      reviewErrors: errors,
      reviewFormData: { rating: String(request.body.rating || ""), title, body },
    });
    return;
  }

  reviews.push({
    id: getNextReviewId(),
    productId: product.id,
    userId: request.currentUser.id,
    authorName: request.currentUser.fullName,
    rating,
    title,
    body,
    createdAt: new Date().toISOString(),
    helpfulCount: 0,
  });

  response.redirect(`/product-detail/${product.id}#reviews`);
});

app.post("/product-detail/:id/reviews/:reviewId/delete", requireLogin, (request, response, next) => {
  const product = getProductById(request.params.id);
  if (!product) {
    next();
    return;
  }

  const reviewId = Number(request.params.reviewId);
  const reviewIndex = reviews.findIndex((review) => review.id === reviewId && review.productId === product.id);

  if (reviewIndex === -1) {
    next();
    return;
  }

  if (reviews[reviewIndex].userId !== request.currentUser.id) {
    response.status(403).send("You can only delete your own review.");
    return;
  }

  reviews.splice(reviewIndex, 1);
  response.redirect(`/product-detail/${product.id}#reviews`);
});

app.post("/product-detail/:id/reviews/:reviewId/helpful", (request, response, next) => {
  const product = getProductById(request.params.id);
  if (!product) {
    next();
    return;
  }

  const reviewId = Number(request.params.reviewId);
  const review = reviews.find((item) => item.id === reviewId && item.productId === product.id);

  if (!review) {
    response.status(404).json({ error: "Review not found." });
    return;
  }

  review.helpfulCount += 1;
  response.json({ helpfulCount: review.helpfulCount });
});

app.get("/wishlist", requireLogin, (request, response) => {
  const sort = String(request.query.sort || "recent");
  const items = sortWishlist(getWishlistForUser(request.currentUser.id), sort).map((item) => ({
    ...item,
    othersCount: countOtherCollectors(item.productId, request.currentUser.id),
  }));

  response.render("wishlist", {
    activePage: "",
    currentUser: request.currentUser,
    items,
    sort,
  });
});

app.post("/wishlist", requireLogin, (request, response) => {
  const productId = String(request.body.productId || "");
  const product = getProductById(productId);

  if (!product) {
    response.status(404).json({ error: "Product not found." });
    return;
  }

  const alreadySaved = wishlistItems.some(
    (item) => item.userId === request.currentUser.id && item.productId === productId,
  );

  if (!alreadySaved) {
    wishlistItems.push({
      id: getNextWishlistItemId(),
      userId: request.currentUser.id,
      productId,
      addedAt: new Date().toISOString(),
      purchased: false,
    });
  }

  const count = getWishlistForUser(request.currentUser.id).length;

  if (request.headers.accept && request.headers.accept.includes("application/json")) {
    response.json({ saved: true, count });
    return;
  }

  response.redirect(request.get("Referer") || "/products");
});

app.delete("/wishlist/:productId", requireLogin, (request, response) => {
  const productId = request.params.productId;
  const index = wishlistItems.findIndex(
    (item) => item.userId === request.currentUser.id && item.productId === productId,
  );

  if (index === -1) {
    response.status(404).json({ error: "Item is not in your wishlist." });
    return;
  }

  wishlistItems.splice(index, 1);
  response.json({ saved: false, count: getWishlistForUser(request.currentUser.id).length });
});

app.post("/wishlist/:productId/move-to-cart", requireLogin, (request, response) => {
  const productId = request.params.productId;
  const product = getProductById(productId);
  const index = wishlistItems.findIndex(
    (item) => item.userId === request.currentUser.id && item.productId === productId,
  );

  if (index === -1) {
    response.status(404).json({ error: "Item is not in your wishlist." });
    return;
  }

  const cart = getUserCart(request.currentUser.id);
  const cartItem = cart.find((item) => item.productId === productId);
  const nextQuantity = (cartItem?.quantity || 0) + 1;

  if (!product || nextQuantity > product.stock) {
    response.status(409).json({ error: "This product is currently out of stock." });
    return;
  }

  if (cartItem) cartItem.quantity = nextQuantity;
  else cart.push({ productId, quantity: 1 });

  wishlistItems[index].purchased = true;
  wishlistItems.splice(index, 1);
  response.json({
    moved: true,
    count: getWishlistForUser(request.currentUser.id).length,
    cart: serializeCart(request.currentUser.id),
  });
});

app.get("/profile", requireLogin, (request, response) => {
  response.render("profile", {
    activePage: "",
    currentUser: request.currentUser,
    avatarColors,
    profileErrors: {},
    passwordErrors: {},
    profileSaved: false,
    passwordSaved: false,
  });
});

app.post("/profile", requireLogin, (request, response) => {
  const { errors, fullName, email, introduction, avatarColor } = getProfileFormErrors({
    ...request.body,
    userId: request.currentUser.id,
  });

  if (Object.keys(errors).length > 0) {
    response.status(400).render("profile", {
      activePage: "",
      currentUser: { ...request.currentUser, fullName, email, introduction, avatarColor },
      avatarColors,
      profileErrors: errors,
      passwordErrors: {},
      profileSaved: false,
      passwordSaved: false,
    });
    return;
  }

  const user = users.find((item) => item.id === request.currentUser.id);
  user.fullName = fullName;
  user.email = email;
  user.introduction = introduction;
  user.avatarColor = avatarColor;

  response.render("profile", {
    activePage: "",
    currentUser: user,
    avatarColors,
    profileErrors: {},
    passwordErrors: {},
    profileSaved: true,
    passwordSaved: false,
  });
});

app.post("/profile/password", requireLogin, (request, response) => {
  const user = users.find((item) => item.id === request.currentUser.id);
  const { errors, newPassword } = getPasswordChangeErrors(request.body, user);

  if (Object.keys(errors).length > 0) {
    response.status(400).render("profile", {
      activePage: "",
      currentUser: user,
      avatarColors,
      profileErrors: {},
      passwordErrors: errors,
      profileSaved: false,
      passwordSaved: false,
    });
    return;
  }

  user.passwordHash = hashSecret(newPassword);

  response.render("profile", {
    activePage: "",
    currentUser: user,
    avatarColors,
    profileErrors: {},
    passwordErrors: {},
    profileSaved: false,
    passwordSaved: true,
  });
});

app.post("/profile/deactivate", requireLogin, (request, response) => {
  const user = users.find((item) => item.id === request.currentUser.id);
  user.status = "deactivated";

  const sessionId = getSessionId(request);
  delete sessions[sessionId];

  response.clearCookie("sessionId");
  response.redirect("/login");
});

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

app.get(["/cart", "/checkout"], requireLogin, (request, response) => {
  const pageName = request.path.slice(1);
  response.render(pageName, { activePage: getActivePage(pageName) });
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
