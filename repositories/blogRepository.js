const { toApplicationUser } = require("./userRepository");

function toApplicationComment(document, usersById) {
  const author = document.authorId ? usersById.get(document.authorId) : null;

  return {
    id: document._id,
    author: author ? author.fullName : document.authorName || "Unknown user",
    authorId: document.authorId || null,
    date: document.createdAt,
    text: document.text,
  };
}

function toApplicationPost(document, usersById, commentsByPostId) {
  const author = usersById.get(document.authorId);

  return {
    id: document._id,
    author: author ? author.fullName : "Unknown user",
    authorId: document.authorId,
    category: document.category,
    comments: commentsByPostId.get(document._id) || [],
    content: document.content,
    date: document.createdAt,
    image: document.image,
    summary: document.summary,
    tags: document.tags,
    title: document.title,
    updatedAt: document.updatedAt,
  };
}

async function getNextId(database, counterName) {
  const counter = await database.collection("counters").findOneAndUpdate(
    { _id: counterName },
    { $inc: { value: 1 } },
    { returnDocument: "after", upsert: true },
  );
  return counter.value;
}

async function hydrateBlogPosts(database, documents) {
  if (documents.length === 0) return [];

  const postIds = documents.map((post) => post._id);
  const comments = await database.collection("blogComments")
    .find({ postId: { $in: postIds }, deleted: { $ne: true } })
    .sort({ createdAt: 1 })
    .toArray();
  const userIds = [...new Set([
    ...documents.map((post) => post.authorId),
    ...comments.map((comment) => comment.authorId),
  ].filter((id) => id !== null && id !== undefined))];
  const userDocuments = userIds.length > 0
    ? await database.collection("users").find({ _id: { $in: userIds } }).toArray()
    : [];
  const usersById = new Map(
    userDocuments.map((user) => {
      const applicationUser = toApplicationUser(user);
      return [applicationUser.id, applicationUser];
    }),
  );
  const commentsByPostId = new Map();

  comments.forEach((comment) => {
    const postComments = commentsByPostId.get(comment.postId) || [];
    postComments.push(toApplicationComment(comment, usersById));
    commentsByPostId.set(comment.postId, postComments);
  });

  return documents.map((post) => toApplicationPost(post, usersById, commentsByPostId));
}

async function listBlogPosts(database) {
  const documents = await database.collection("blogPosts")
    .find({ deleted: { $ne: true } })
    .sort({ createdAt: -1, _id: -1 })
    .toArray();
  return hydrateBlogPosts(database, documents);
}

async function findBlogPostById(database, postId) {
  const document = await database.collection("blogPosts").findOne({
    _id: Number(postId),
    deleted: { $ne: true },
  });

  if (!document) return null;
  const [post] = await hydrateBlogPosts(database, [document]);
  return post;
}

async function createBlogPost(database, postData) {
  const id = await getNextId(database, "blogPosts");
  const now = new Date();
  const document = {
    _id: id,
    ...postData,
    createdAt: now,
    deleted: false,
    updatedAt: now,
  };

  await database.collection("blogPosts").insertOne(document);
  return id;
}

async function updateBlogPost(database, postId, authorId, changes) {
  return database.collection("blogPosts").updateOne(
    { _id: Number(postId), authorId: Number(authorId), deleted: { $ne: true } },
    { $set: { ...changes, updatedAt: new Date() } },
  );
}

async function deleteBlogPost(database, postId, authorId) {
  return database.collection("blogPosts").updateOne(
    { _id: Number(postId), authorId: Number(authorId), deleted: { $ne: true } },
    { $set: { deleted: true, updatedAt: new Date() } },
  );
}

async function createBlogComment(database, postId, user, text) {
  const id = await getNextId(database, "blogComments");
  const now = new Date();

  await database.collection("blogComments").insertOne({
    _id: id,
    authorId: Number(user.id),
    authorName: user.fullName,
    createdAt: now,
    deleted: false,
    postId: Number(postId),
    text,
    updatedAt: now,
  });

  return id;
}

module.exports = {
  createBlogComment,
  createBlogPost,
  deleteBlogPost,
  findBlogPostById,
  listBlogPosts,
  updateBlogPost,
};
