const express = require("express");
const path = require("node:path");
const { loadCurrentUser } = require("./middleware/auth");
const { createAdminRouter } = require("./routes/adminRoutes");
const { createAuthRouter } = require("./routes/authRoutes");
const { createBlogRouter } = require("./routes/blogRoutes");
const { createCartRouter } = require("./routes/cartRoutes");
const { createForumRouter } = require("./routes/forumRoutes");
const { createPageRouter } = require("./routes/pageRoutes");
const { createProductRouter } = require("./routes/productRoutes");
const { createProfileRouter } = require("./routes/profileRoutes");
const { createSitemapRouter } = require("./routes/sitemapRoutes");
const { createCartService } = require("./services/cartService");
const { ShopError } = require("./utils/shopError");
const {
  reviews,
  wishlistItems,
  getNextReviewId,
  getNextWishlistItemId,
} = require("./data");

function createApp(database) {
  const app = express();
  const cartService = createCartService(database);

  app.locals.database = database;
  app.get("/health", (request, response) => {
    response.set("Cache-Control", "no-store");
    response.json({ status: "ok", revision: process.env.APP_REVISION || "development" });
  });
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, "public")));
  app.use(loadCurrentUser);

  app.use(createAdminRouter());
  app.use(createAuthRouter());
  app.use(createBlogRouter());
  app.use(createProfileRouter());
  app.use(createSitemapRouter());
  app.use(createForumRouter());
  app.use(createCartRouter());
  app.use(createProductRouter({
    database,
    reviews,
    wishlistItems,
    getNextReviewId,
    getNextWishlistItemId,
    cartService,
  }));
  app.use(createPageRouter());

  app.use((request, response) => {
    response.status(404).send("Page not found");
  });

  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    const expected = error instanceof ShopError;
    const status = expected ? error.status : error.status === 400 ? 400 : 500;
    const message = expected ? error.message : status === 400 ? "Invalid request body." : "Something went wrong. Please try again.";
    if (!expected && status === 500) console.error(error);
    if (request.path.startsWith("/api/") || request.path === "/checkout" || request.accepts(["html", "json"]) === "json") {
      response.status(status).json({ message, errors: expected ? error.errors : {} });
    } else {
      response.status(status).send(message);
    }
  });

  return app;
}

module.exports = { createApp };
