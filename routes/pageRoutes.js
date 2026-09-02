const express = require("express");
const { requireLogin } = require("../middleware/auth");

const pageNames = ["cart", "checkout"];

function getActivePage(pageName) {
  if (pageName.includes("blog")) return "blog";
  if (pageName.includes("product")) return "shop";
  if (pageName.includes("forum")) return "forum";
  return "";
}

function createPageRouter() {
  const router = express.Router();

  router.get("/", (request, response) => {
    response.render("index", { activePage: "home" });
  });

  router.get(["/cart", "/checkout"], requireLogin, (request, response) => {
    const pageName = request.path.slice(1);
    response.render(pageName, { activePage: getActivePage(pageName) });
  });

  router.get("/:page", (request, response, next) => {
    const pageName = request.params.page;

    if (!pageNames.includes(pageName)) {
      next();
      return;
    }

    response.render(pageName, { activePage: getActivePage(pageName) });
  });

  return router;
}

module.exports = { createPageRouter };
