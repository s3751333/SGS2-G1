require("dotenv").config({ quiet: true });

const express = require("express");
const path = require("node:path");
const crypto = require("node:crypto");
const { closeDatabase, connectDatabase } = require("./database/connection");
const { ensureDatabaseIndexes } = require("./database/indexes");
const { loadCurrentUser, requireApiLogin, requireLogin } = require("./middleware/auth");
const { findUserByEmail, findUserById, updateUser } = require("./repositories/userRepository");
const { createAdminRouter } = require("./routes/adminRoutes");
const { createAuthRouter } = require("./routes/authRoutes");
const { createBlogRouter } = require("./routes/blogRoutes");
const { createForumRouter } = require("./routes/forumRoutes");
const { createSitemapRouter } = require("./routes/sitemapRoutes");
const { clearSessionCookie, deleteUserSessions } = require("./services/sessionService");
const { checkSecret, hashSecret } = require("./utils/security");
const {
  users,
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
const cartsByUserId = new Map();
const orders = [];
const MAX_CART_QUANTITY = 99;
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

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

app.use(loadCurrentUser);
app.use(createAdminRouter());
app.use(createAuthRouter());
app.use(createBlogRouter());
app.use(createSitemapRouter({ products, forumTopics }));
app.use(createForumRouter({ users, forumTopics, forumReplies }));

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
    currentUser: response.locals.currentUser,
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

  const currentUser = response.locals.currentUser;
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

app.post("/profile", requireLogin, async (request, response) => {
  const database = request.app.locals.database;
  const { errors, fullName, email, introduction, avatarColor } = getProfileFormErrors(request.body);
  const existingUser = await findUserByEmail(database, email);

  if (existingUser && existingUser.id !== request.currentUser.id) {
    errors.email = "That email address is already in use by another account.";
  }

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

  const user = await updateUser(database, request.currentUser.id, {
    avatarColor,
    email,
    fullName,
    introduction,
  });

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

app.post("/profile/password", requireLogin, async (request, response) => {
  const database = request.app.locals.database;
  const user = await findUserById(database, request.currentUser.id);
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

  const updatedUser = await updateUser(database, user.id, {
    passwordHash: hashSecret(newPassword),
  });

  response.render("profile", {
    activePage: "",
    currentUser: updatedUser,
    avatarColors,
    profileErrors: {},
    passwordErrors: {},
    profileSaved: false,
    passwordSaved: true,
  });
});

app.post("/profile/deactivate", requireLogin, async (request, response) => {
  const database = request.app.locals.database;
  await updateUser(database, request.currentUser.id, { status: "deactivated" });
  await deleteUserSessions(database, request.currentUser.id);
  clearSessionCookie(response);
  response.redirect("/login");
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

app.get("/", (request, response) => {
  response.render("index", { activePage: "home" });
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

app.use((request, response) => {
  response.status(404).send("Page not found");
});

let server;

async function startServer() {
  const database = await connectDatabase();
  await ensureDatabaseIndexes(database);
  app.locals.database = database;

  server = app.listen(PORT, () => {
    console.log(`BookNook is running at http://localhost:${PORT}`);
  });
}

async function stopServer(signal) {
  console.log(`\n${signal} received. Closing BookNook...`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await closeDatabase();
  process.exit(0);
}

process.once("SIGINT", () => stopServer("SIGINT"));
process.once("SIGTERM", () => stopServer("SIGTERM"));

startServer().catch((error) => {
  console.error(`BookNook could not start: ${error.message}`);
  process.exit(1);
});
