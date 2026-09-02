const express = require("express");
const { listBlogPosts } = require("../repositories/blogRepository");
const { buildSitemapSections } = require("../services/sitemapService");

function createSitemapRouter({ products, forumTopics }) {
  const router = express.Router();

  router.get("/sitemap", async (request, response) => {
    const blogPosts = await listBlogPosts(request.app.locals.database);

    response.render("sitemap", {
      activePage: "",
      sitemapSections: buildSitemapSections({
        currentUser: request.currentUser,
        products,
        blogPosts,
        forumTopics,
      }),
    });
  });

  return router;
}

module.exports = { createSitemapRouter };
