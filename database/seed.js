require("dotenv").config({ quiet: true });

const { blogPosts: sampleBlogPosts, users: sampleUsers, forumTopics, forumReplies, reviews, wishlistItems } = require("../data");
const { closeDatabase, connectDatabase } = require("./connection");
const { ensureDatabaseIndexes } = require("./indexes");
const { seedProducts } = require("./seedProducts");

function createUserSeedDocument(user) {
  const { id, ...userData } = user;
  const seedDate = new Date("2026-08-01T00:00:00.000Z");

  return {
    _id: id,
    ...userData,
    createdAt: seedDate,
    updatedAt: seedDate,
  };
}

async function seedUsers(database) {
  const users = database.collection("users");
  const operations = sampleUsers.map((user) => ({
    updateOne: {
      filter: { _id: user.id },
      update: { $setOnInsert: createUserSeedDocument(user) },
      upsert: true,
    },
  }));

  const result = await users.bulkWrite(operations, { ordered: true });
  const highestUserId = Math.max(...sampleUsers.map((user) => user.id));
  await database.collection("counters").updateOne(
    { _id: "users" },
    { $max: { value: highestUserId } },
    { upsert: true },
  );
  console.log(`Users ready: ${result.upsertedCount} inserted, ${result.matchedCount} already existed.`);
}

function createBlogSeedData() {
  let nextCommentId = 1;
  const posts = [];
  const comments = [];

  sampleBlogPosts.forEach((post) => {
    const { comments: postComments, date, id, ...postData } = post;
    const createdAt = new Date(`${date}T00:00:00.000Z`);

    posts.push({
      _id: id,
      ...postData,
      createdAt,
      deleted: false,
      updatedAt: createdAt,
    });

    postComments.forEach((comment) => {
      const commentDate = new Date(`${comment.date}T00:00:00.000Z`);
      comments.push({
        _id: nextCommentId,
        authorId: null,
        authorName: comment.author,
        createdAt: commentDate,
        deleted: false,
        postId: id,
        text: comment.text,
        updatedAt: commentDate,
      });
      nextCommentId += 1;
    });
  });

  return { posts, comments };
}

async function seedBlog(database) {
  const { posts, comments } = createBlogSeedData();
  const postOperations = posts.map((post) => ({
    updateOne: {
      filter: { _id: post._id },
      update: { $setOnInsert: post },
      upsert: true,
    },
  }));
  const commentOperations = comments.map((comment) => ({
    updateOne: {
      filter: { _id: comment._id },
      update: { $setOnInsert: comment },
      upsert: true,
    },
  }));
  const postResult = await database.collection("blogPosts").bulkWrite(postOperations);
  const commentResult = await database.collection("blogComments").bulkWrite(commentOperations);

  await database.collection("counters").updateOne(
    { _id: "blogPosts" },
    { $max: { value: Math.max(...posts.map((post) => post._id)) } },
    { upsert: true },
  );
  await database.collection("counters").updateOne(
    { _id: "blogComments" },
    { $max: { value: Math.max(...comments.map((comment) => comment._id)) } },
    { upsert: true },
  );

  console.log(`Blog posts ready: ${postResult.upsertedCount} inserted, ${postResult.matchedCount} already existed.`);
  console.log(`Blog comments ready: ${commentResult.upsertedCount} inserted, ${commentResult.matchedCount} already existed.`);
}

async function seedDatabase(database, args = []) {
  await ensureDatabaseIndexes(database);
  if (!args.includes("--forum")) {
    const result = await seedProducts(database);
    console.log(`Products: ${result.upsertedCount} inserted, ${result.matchedCount} already existed.`);
  }
  if (args.includes("--shop")) return;
  if (!args.includes("--forum")) {
    await seedUsers(database);
    await seedBlog(database);
  }
  for (const [name, records] of [["forumTopics", forumTopics], ["forumReplies", forumReplies]]) {
    const documents = records.map(({ id, ...record }) => ({
      _id: id, ...record, createdAt: new Date(record.createdAt), updatedAt: new Date(record.updatedAt),
    }));
    const result = await database.collection(name).bulkWrite(documents.map((document) => ({
      updateOne: { filter: { _id: document._id }, update: { $setOnInsert: document }, upsert: true },
    })));
    const latest = await database.collection(name).find().sort({ _id: -1 }).limit(1).next();
    await database.collection("counters").updateOne(
      { _id: name }, { $max: { value: latest._id } }, { upsert: true },
    );
    console.log(`${name}: ${result.upsertedCount} inserted, ${result.matchedCount} already existed.`);
  }

  const reviewDocuments = reviews.map(({ id, createdAt, ...record }) => ({
    _id: id, ...record, createdAt: new Date(createdAt), updatedAt: new Date(createdAt),
  }));
  const reviewResult = await database.collection("reviews").bulkWrite(reviewDocuments.map((document) => ({
    updateOne: { filter: { _id: document._id }, update: { $setOnInsert: document }, upsert: true },
  })));
  const latestReview = await database.collection("reviews").find().sort({ _id: -1 }).limit(1).next();
  if (latestReview) {
    await database.collection("counters").updateOne(
      { _id: "reviews" }, { $max: { value: latestReview._id } }, { upsert: true },
    );
  }
  console.log(`reviews: ${reviewResult.upsertedCount} inserted, ${reviewResult.matchedCount} already existed.`);

  const wishlistDocuments = wishlistItems.map(({ id, addedAt, ...record }) => ({
    _id: id, ...record, addedAt: new Date(addedAt),
  }));
  const wishlistResult = await database.collection("wishlistItems").bulkWrite(wishlistDocuments.map((document) => ({
    updateOne: { filter: { _id: document._id }, update: { $setOnInsert: document }, upsert: true },
  })));
  const latestWishlistItem = await database.collection("wishlistItems").find().sort({ _id: -1 }).limit(1).next();
  if (latestWishlistItem) {
    await database.collection("counters").updateOne(
      { _id: "wishlistItems" }, { $max: { value: latestWishlistItem._id } }, { upsert: true },
    );
  }
  console.log(`wishlistItems: ${wishlistResult.upsertedCount} inserted, ${wishlistResult.matchedCount} already existed.`);
}

if (require.main === module) connectDatabase()
  .then((database) => seedDatabase(database, process.argv.slice(2)))
  .catch((error) => {
    console.error(`Database seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(closeDatabase);

module.exports = { seedDatabase };
