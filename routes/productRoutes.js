const express = require("express");
const { requireLogin } = require("../middleware/auth");
const {
  getUploadedReviewImagePath,
  handleReviewImageUpload,
  removeUploadedReviewImage,
} = require("../middleware/reviewImageUpload");

const { findProductById, listProducts } = require("../repositories/productRepository");
const {
  createReview,
  deleteReview,
  findReviewById,
  findReviewByUserAndProduct,
  incrementHelpfulCount,
  listReviewsForProduct,
  updateReview,
} = require("../repositories/reviewRepository");
const {
  countOtherWishlistItems,
  createWishlistItem,
  deleteWishlistItem,
  findWishlistItem,
  listWishlistItemsForUser,
} = require("../repositories/wishlistRepository");

const productCategories = ["fiction", "reference", "self-help", "board-games"];
const DUPLICATE_KEY_ERROR = 11000;

function createProductRouter({ database, cartService }) {
  const router = express.Router();

  function getProductById(productId) {
    return findProductById(database, productId);
  }

  function getRatingSummary(productReviews) {
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

  async function getRatingSummaryForProduct(productId) {
    return getRatingSummary(await listReviewsForProduct(database, productId));
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

  function sortProducts(productList, ratingByProductId, sortKey) {
    const sorted = [...productList];

    if (sortKey === "price-low") {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortKey === "price-high") {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortKey === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortKey === "rating") {
      sorted.sort((a, b) => ratingByProductId.get(b.id).average - ratingByProductId.get(a.id).average);
    }

    return sorted;
  }

  async function getWishlistForUser(userId) {
    const [items, products] = await Promise.all([
      listWishlistItemsForUser(database, userId),
      listProducts(database),
    ]);
    const productById = new Map(products.map((product) => [product.id, product]));

    return items
      .map((item) => ({ ...item, product: productById.get(item.productId) || null }))
      .filter((item) => item.product !== null);
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

  router.get("/products", async (request, response) => {
    const query = String(request.query.q || "").trim();
    const category = String(request.query.category || "all");
    const sort = String(request.query.sort || "recent");
    const products = await listProducts(database);
    const filtered = products
      .filter((product) => category === "all" || product.category === category)
      .filter((product) => matchesProductSearch(product, query));

    const ratings = await Promise.all(filtered.map(async (product) => [product.id, await getRatingSummaryForProduct(product.id)]));
    const ratingByProductId = new Map(ratings);
    const sorted = sortProducts(filtered, ratingByProductId, sort);

    response.render("products", {
      activePage: "shop",
      currentUser: response.locals.currentUser,
      products: sorted.map((product) => ({ ...product, rating: ratingByProductId.get(product.id) })),
      productCategories,
      query,
      category,
      sort,
      resultCount: sorted.length,
    });
  });

  router.get("/product-detail/:id", async (request, response, next) => {
    const product = await getProductById(request.params.id);

    if (!product) {
      next();
      return;
    }

    const currentUser = response.locals.currentUser;
    const sort = String(request.query.sort || "recent");
    const allReviews = await listReviewsForProduct(database, product.id);
    const productReviews = sortReviews(allReviews, sort)
      .map((review) => ({ ...review, isOwnReview: currentUser ? review.userId === currentUser.id : false }));
    const wishlistEntry = currentUser
      ? await findWishlistItem(database, currentUser.id, product.id)
      : null;

    response.render("product-detail", {
      activePage: "shop",
      currentUser,
      product,
      reviews: productReviews,
      rating: getRatingSummary(allReviews),
      reviewSort: sort,
      isInWishlist: Boolean(wishlistEntry),
      reviewErrors: {},
      reviewFormData: { rating: "", title: "", body: "" },
    });
  });

  function getReviewSummary(body) {
    return body.length > 150 ? `${body.slice(0, 150).trim()}…` : body;
  }

  router.get("/product-detail/:id/reviews", async (request, response, next) => {
    const product = await getProductById(request.params.id);

    if (!product) {
      next();
      return;
    }

    const sort = String(request.query.sort || "recent");
    const currentUser = response.locals.currentUser;
    const allReviews = await listReviewsForProduct(database, product.id);
    const productReviews = sortReviews(allReviews, sort).map((review) => ({
      ...review,
      summary: getReviewSummary(review.body),
      isOwnReview: currentUser ? review.userId === currentUser.id : false,
    }));

    response.render("reviews-list", {
      activePage: "shop",
      currentUser,
      product,
      reviews: productReviews,
      rating: getRatingSummary(allReviews),
      reviewSort: sort,
    });
  });

  router.get("/product-detail/:id/reviews/:reviewId", async (request, response, next) => {
    const product = await getProductById(request.params.id);

    if (!product) {
      next();
      return;
    }

    const review = await findReviewById(database, request.params.reviewId, product.id);

    if (!review) {
      next();
      return;
    }

    const currentUser = response.locals.currentUser;

    response.render("review-detail", {
      activePage: "shop",
      currentUser,
      product,
      review: { ...review, isOwnReview: currentUser ? review.userId === currentUser.id : false },
    });
  });

  router.post("/product-detail/:id/reviews", requireLogin, handleReviewImageUpload, async (request, response, next) => {
    const uploadedImagePath = getUploadedReviewImagePath(request);
    const product = await getProductById(request.params.id);

    if (!product) {
      await removeUploadedReviewImage(uploadedImagePath);
      next();
      return;
    }

    const alreadyReviewed = await findReviewByUserAndProduct(database, product.id, request.currentUser.id);
    const { errors, rating, title, body } = getReviewFormData(request.body);

    if (alreadyReviewed) {
      errors.duplicate = "You have already reviewed this product. Edit or delete your existing review instead.";
    }

    if (request.reviewImageUploadError) {
      errors.image = request.reviewImageUploadError;
    }

    if (Object.keys(errors).length > 0) {
      await removeUploadedReviewImage(uploadedImagePath);
      const allReviews = await listReviewsForProduct(database, product.id);
      const productReviews = sortReviews(allReviews, "recent")
        .map((review) => ({ ...review, isOwnReview: review.userId === request.currentUser.id }));
      const wishlistEntry = await findWishlistItem(database, request.currentUser.id, product.id);

      response.status(400).render("product-detail", {
        activePage: "shop",
        currentUser: request.currentUser,
        product,
        reviews: productReviews,
        rating: getRatingSummary(allReviews),
        reviewSort: "recent",
        isInWishlist: Boolean(wishlistEntry),
        reviewErrors: errors,
        reviewFormData: { rating: String(request.body.rating || ""), title, body },
      });
      return;
    }

    try {
      await createReview(database, {
        productId: product.id,
        userId: request.currentUser.id,
        authorName: request.currentUser.fullName,
        rating,
        title,
        body,
        image: uploadedImagePath,
      });
    } catch (error) {
      await removeUploadedReviewImage(uploadedImagePath);
      // A duplicate slipping past the check above (e.g. a double-submit) is
      // caught here too, since productId+userId has a unique index.
      if (error.code !== DUPLICATE_KEY_ERROR) throw error;
    }

    response.redirect(`/product-detail/${product.id}#reviews`);
  });

  router.get("/product-detail/:id/reviews/:reviewId/edit", requireLogin, async (request, response, next) => {
    const product = await getProductById(request.params.id);
    if (!product) {
      next();
      return;
    }

    const review = await findReviewById(database, request.params.reviewId, product.id);
    if (!review) {
      next();
      return;
    }

    if (review.userId !== request.currentUser.id) {
      response.status(403).send("You can only edit your own review.");
      return;
    }

    response.render("review-edit", {
      activePage: "shop",
      currentUser: request.currentUser,
      product,
      review,
      errors: {},
      formData: { rating: String(review.rating), title: review.title, body: review.body },
    });
  });

  router.post("/product-detail/:id/reviews/:reviewId/edit", requireLogin, handleReviewImageUpload, async (request, response, next) => {
    const uploadedImagePath = getUploadedReviewImagePath(request);
    const product = await getProductById(request.params.id);
    if (!product) {
      await removeUploadedReviewImage(uploadedImagePath);
      next();
      return;
    }

    const review = await findReviewById(database, request.params.reviewId, product.id);
    if (!review) {
      await removeUploadedReviewImage(uploadedImagePath);
      next();
      return;
    }

    if (review.userId !== request.currentUser.id) {
      await removeUploadedReviewImage(uploadedImagePath);
      response.status(403).send("You can only edit your own review.");
      return;
    }

    const { errors, rating, title, body } = getReviewFormData(request.body);

    if (request.reviewImageUploadError) {
      errors.image = request.reviewImageUploadError;
    }

    if (Object.keys(errors).length > 0) {
      await removeUploadedReviewImage(uploadedImagePath);
      response.status(400).render("review-edit", {
        activePage: "shop",
        currentUser: request.currentUser,
        product,
        review,
        errors,
        formData: { rating: String(request.body.rating || ""), title, body },
      });
      return;
    }

    const removePhoto = request.body.removeImage === "on" && !uploadedImagePath;
    const changes = { rating, title, body };

    if (uploadedImagePath) {
      changes.image = uploadedImagePath;
    } else if (removePhoto) {
      changes.image = "";
    }

    let updatedReview;
    try {
      updatedReview = await updateReview(database, review.id, product.id, request.currentUser.id, changes);
    } catch (error) {
      await removeUploadedReviewImage(uploadedImagePath);
      throw error;
    }

    if (!updatedReview) {
      await removeUploadedReviewImage(uploadedImagePath);
      next();
      return;
    }

    if ((uploadedImagePath || removePhoto) && review.image) {
      await removeUploadedReviewImage(review.image);
    }

    response.redirect(`/product-detail/${product.id}#reviews`);
  });

  router.post("/product-detail/:id/reviews/:reviewId/delete", requireLogin, async (request, response, next) => {
    const product = await getProductById(request.params.id);

    if (!product) {
      next();
      return;
    }

    const review = await findReviewById(database, request.params.reviewId, product.id);

    if (!review) {
      next();
      return;
    }

    if (review.userId !== request.currentUser.id) {
      response.status(403).send("You can only delete your own review.");
      return;
    }

    await deleteReview(database, review.id, product.id, request.currentUser.id);
    if (review.image) await removeUploadedReviewImage(review.image);
    response.redirect(`/product-detail/${product.id}#reviews`);
  });

  router.post("/product-detail/:id/reviews/:reviewId/helpful", async (request, response, next) => {
    const product = await getProductById(request.params.id);

    if (!product) {
      next();
      return;
    }

    const review = await incrementHelpfulCount(database, request.params.reviewId, product.id);

    if (!review) {
      response.status(404).json({ error: "Review not found." });
      return;
    }

    response.json({ helpfulCount: review.helpfulCount });
  });

  router.get("/wishlist", requireLogin, async (request, response) => {
    const sort = String(request.query.sort || "recent");
    const items = sortWishlist(await getWishlistForUser(request.currentUser.id), sort);
    const withCollectorCounts = await Promise.all(items.map(async (item) => ({
      ...item,
      othersCount: await countOtherWishlistItems(database, item.productId, request.currentUser.id),
    })));

    response.render("wishlist", {
      activePage: "",
      currentUser: request.currentUser,
      items: withCollectorCounts,
      sort,
    });
  });

  router.post("/wishlist", requireLogin, async (request, response) => {
    const productId = String(request.body.productId || "");
    const product = await getProductById(productId);

    if (!product) {
      response.status(404).json({ error: "Product not found." });
      return;
    }

    const alreadySaved = await findWishlistItem(database, request.currentUser.id, productId);

    if (!alreadySaved) {
      try {
        await createWishlistItem(database, request.currentUser.id, productId);
      } catch (error) {
        if (error.code !== DUPLICATE_KEY_ERROR) throw error;
      }
    }

    const count = (await listWishlistItemsForUser(database, request.currentUser.id)).length;

    if (request.headers.accept && request.headers.accept.includes("application/json")) {
      response.json({ saved: true, count });
      return;
    }

    response.redirect(request.get("Referer") || "/products");
  });

  router.delete("/wishlist/:productId", requireLogin, async (request, response) => {
    const removed = await deleteWishlistItem(database, request.currentUser.id, request.params.productId);

    if (!removed) {
      response.status(404).json({ error: "Item is not in your wishlist." });
      return;
    }

    response.json({ saved: false, count: (await listWishlistItemsForUser(database, request.currentUser.id)).length });
  });

  router.post("/wishlist/:productId/move-to-cart", requireLogin, async (request, response) => {
    const productId = request.params.productId;
    const wishlistEntry = await findWishlistItem(database, request.currentUser.id, productId);

    if (!wishlistEntry) {
      response.status(404).json({ error: "Item is not in your wishlist." });
      return;
    }

    const cart = await cartService.addItem(request.currentUser.id, productId, 1);
    await deleteWishlistItem(database, request.currentUser.id, productId);

    response.json({
      moved: true,
      count: (await listWishlistItemsForUser(database, request.currentUser.id)).length,
      cart,
    });
  });

  return router;
}

module.exports = { createProductRouter };
