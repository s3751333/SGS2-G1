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

function createApp(database) {
  const app = express();
  const cartService = createCartService(products);

  app.locals.database = database;
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
  app.use(createSitemapRouter({ products, forumTopics }));
  app.use(createForumRouter({ users, forumTopics, forumReplies }));
  app.use(createCartRouter({ products, cartService }));
  app.use(createProductRouter({
    products,
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

  return app;
}

module.exports = { createApp };
