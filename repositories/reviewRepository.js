function toReview(document) {
  if (!document) return null;
  const { _id, ...review } = document;
  return { id: _id, ...review };
}

async function listReviewsForProduct(database, productId) {
  const documents = await database.collection("reviews").find({ productId }).sort({ createdAt: -1 }).toArray();
  return documents.map(toReview);
}

async function findReviewByUserAndProduct(database, productId, userId) {
  return toReview(await database.collection("reviews").findOne({ productId, userId }));
}

async function findReviewById(database, reviewId, productId) {
  if (!/^[1-9]\d*$/.test(String(reviewId))) return null;
  return toReview(await database.collection("reviews").findOne({ _id: Number(reviewId), productId }));
}

async function createReview(database, fields) {
  const counter = await database.collection("counters").findOneAndUpdate(
    { _id: "reviews" }, { $inc: { value: 1 } }, { upsert: true, returnDocument: "after" },
  );
  const now = new Date();
  const document = { _id: counter.value, ...fields, createdAt: now, updatedAt: now, helpfulCount: 0 };
  await database.collection("reviews").insertOne(document);
  return toReview(document);
}

// Ownership check and update happen in a single atomic query, matching the
// pattern in forumRepository.updateForumRecord: a mismatched userId simply
// matches nothing rather than requiring a separate check-then-write step.
async function updateReview(database, reviewId, productId, userId, changes) {
  if (!/^[1-9]\d*$/.test(String(reviewId))) return null;
  return toReview(await database.collection("reviews").findOneAndUpdate(
    { _id: Number(reviewId), productId, userId },
    { $set: { ...changes, updatedAt: new Date() } },
    { returnDocument: "after" },
  ));
}

async function deleteReview(database, reviewId, productId, userId) {
  if (!/^[1-9]\d*$/.test(String(reviewId))) return null;
  return toReview(await database.collection("reviews").findOneAndDelete(
    { _id: Number(reviewId), productId, userId },
  ));
}

async function incrementHelpfulCount(database, reviewId, productId) {
  if (!/^[1-9]\d*$/.test(String(reviewId))) return null;
  return toReview(await database.collection("reviews").findOneAndUpdate(
    { _id: Number(reviewId), productId },
    { $inc: { helpfulCount: 1 } },
    { returnDocument: "after" },
  ));
}

module.exports = {
  createReview,
  deleteReview,
  findReviewById,
  findReviewByUserAndProduct,
  incrementHelpfulCount,
  listReviewsForProduct,
  updateReview,
};
