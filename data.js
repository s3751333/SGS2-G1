async function ensureDatabaseIndexes(database) {
  await database.collection("carts").createIndex({ userId: 1 }, { name: "unique_cart_user", unique: true });
  await database.collection("orders").createIndex({ userId: 1, createdAt: -1 }, { name: "orders_by_user" });
  await database.collection("orders").createIndex(
    { userId: 1, requestKey: 1 },
    { name: "unique_checkout_request", unique: true, partialFilterExpression: { requestKey: { $type: "string" } } },
  );
  await database.collection("products").createIndex({ category: 1, displayOrder: 1 }, { name: "products_by_category_display_order" });
  await database.collection("forumTopics").createIndex(
    { deleted: 1, createdAt: -1 }, { name: "visible_topics_by_date" },
  );
  await database.collection("forumReplies").createIndex(
    { topicId: 1, deleted: 1, createdAt: 1 }, { name: "replies_by_topic" },
  );
  const users = database.collection("users");
  const sessions = database.collection("sessions");
  const passwordResetTokens = database.collection("passwordResetTokens");
  const blogPosts = database.collection("blogPosts");
  const blogComments = database.collection("blogComments");

  await users.createIndex(
    { username: 1 },
    {
      collation: { locale: "en", strength: 2 },
      name: "unique_username",
      unique: true,
    },
  );

  await users.createIndex(
    { email: 1 },
    {
      collation: { locale: "en", strength: 2 },
      name: "unique_email",
      unique: true,
    },
  );

  await users.createIndex({ role: 1, status: 1 }, { name: "role_and_status" });
  await sessions.createIndex({ userId: 1 }, { name: "session_user" });
  await sessions.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "expire_sessions" },
  );
  await passwordResetTokens.createIndex({ userId: 1 }, { name: "reset_user" });
  await passwordResetTokens.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "expire_password_resets" },
  );
  await blogPosts.createIndex(
    { deleted: 1, createdAt: -1 },
    { name: "published_posts_by_date" },
  );
  await blogPosts.createIndex(
    { authorId: 1, createdAt: -1 },
    { name: "posts_by_author" },
  );
  await blogPosts.createIndex(
    { category: 1, createdAt: -1 },
    { name: "posts_by_category" },
  );
  await blogPosts.createIndex(
    { title: "text", summary: "text", tags: "text", content: "text" },
    { name: "blog_search" },
  );
  await blogComments.createIndex(
    { postId: 1, deleted: 1, createdAt: 1 },
    { name: "comments_by_post" },
  );
  await blogComments.createIndex(
    { authorId: 1, createdAt: -1 },
    { name: "comments_by_author" },
  );

  const reviews = database.collection("reviews");
  const wishlistItems = database.collection("wishlistItems");

  await reviews.createIndex(
    { productId: 1, userId: 1 },
    { name: "unique_review_per_user_product", unique: true, partialFilterExpression: { userId: { $type: "number" } } },
  );
  await reviews.createIndex({ productId: 1, createdAt: -1 }, { name: "reviews_by_product_date" });
  await reviews.createIndex({ productId: 1, helpfulCount: -1 }, { name: "reviews_by_product_helpful" });

  await wishlistItems.createIndex(
    { userId: 1, productId: 1 },
    { name: "unique_wishlist_entry", unique: true },
  );
  await wishlistItems.createIndex({ productId: 1 }, { name: "wishlist_by_product" });
}

module.exports = { ensureDatabaseIndexes };
