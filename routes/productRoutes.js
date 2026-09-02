const express = require("express");
const { requireLogin } = require("../middleware/auth");

const productCategories = ["fiction", "reference", "self-help", "board-games"];

function createProductRouter({
  products,
  reviews,
  wishlistItems,
  getNextReviewId,
  getNextWishlistItemId,
  cartService,
}) {
  const router = express.Router();

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

  function getReviewFormData(body) {
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

  router.get("/products", (request, response) => {
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

  router.get("/product-detail/:id", (request, response, next) => {
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

  router.post("/product-detail/:id/reviews", requireLogin, (request, response, next) => {
    const product = getProductById(request.params.id);

    if (!product) {
      next();
      return;
    }

    const alreadyReviewed = reviews.some(
      (review) => review.productId === product.id && review.userId === request.currentUser.id,
    );
    const { errors, rating, title, body } = getReviewFormData(request.body);

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

  router.post("/product-detail/:id/reviews/:reviewId/delete", requireLogin, (request, response, next) => {
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

  router.post("/product-detail/:id/reviews/:reviewId/helpful", (request, response, next) => {
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

  router.get("/wishlist", requireLogin, (request, response) => {
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

  router.post("/wishlist", requireLogin, (request, response) => {
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

  router.delete("/wishlist/:productId", requireLogin, (request, response) => {
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

  router.post("/wishlist/:productId/move-to-cart", requireLogin, (request, response) => {
    const productId = request.params.productId;
    const product = getProductById(productId);
    const index = wishlistItems.findIndex(
      (item) => item.userId === request.currentUser.id && item.productId === productId,
    );

    if (index === -1) {
      response.status(404).json({ error: "Item is not in your wishlist." });
      return;
    }

    const cart = cartService.getUserCart(request.currentUser.id);
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
      cart: cartService.serializeCart(request.currentUser.id),
    });
  });

  return router;
}

module.exports = { createProductRouter };
