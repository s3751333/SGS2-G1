const express = require("express");
const { listForumTopics } = require("../repositories/forumRepository");
const { listBlogPosts } = require("../repositories/blogRepository");
const { buildSitemapSections } = require("../services/sitemapService");
const { listProducts } = require("../repositories/productRepository");

function createSitemapRouter() {
  const router = express.Router();

  router.get("/sitemap", async (request, response) => {
    const blogPosts = await listBlogPosts(request.app.locals.database);

    response.render("sitemap", {
      activePage: "",
      sitemapSections: buildSitemapSections({
        currentUser: request.currentUser,
        products: await listProducts(request.app.locals.database),
        blogPosts,
        forumTopics: await listForumTopics(request.app.locals.database),
      }),
    });
  });

  return router;
}

module.exports = { createSitemapRouter };
