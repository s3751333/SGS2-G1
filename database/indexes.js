async function ensureDatabaseIndexes(database) {
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
}

module.exports = { ensureDatabaseIndexes };
