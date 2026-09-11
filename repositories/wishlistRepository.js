function toWishlistItem(document) {
  if (!document) return null;
  const { _id, ...item } = document;
  return { id: _id, ...item };
}

async function listWishlistItemsForUser(database, userId) {
  const documents = await database.collection("wishlistItems").find({ userId }).sort({ addedAt: -1 }).toArray();
  return documents.map(toWishlistItem);
}

async function findWishlistItem(database, userId, productId) {
  return toWishlistItem(await database.collection("wishlistItems").findOne({ userId, productId }));
}

async function countOtherWishlistItems(database, productId, excludeUserId) {
  return database.collection("wishlistItems").countDocuments({ productId, userId: { $ne: excludeUserId } });
}

async function createWishlistItem(database, userId, productId) {
  const counter = await database.collection("counters").findOneAndUpdate(
    { _id: "wishlistItems" }, { $inc: { value: 1 } }, { upsert: true, returnDocument: "after" },
  );
  const document = { _id: counter.value, userId, productId, addedAt: new Date(), purchased: false };
  await database.collection("wishlistItems").insertOne(document);
  return toWishlistItem(document);
}

// Ownership is implicit in the filter (userId must match), so this can only
// ever remove the signed-in user's own saved item.
async function deleteWishlistItem(database, userId, productId) {
  return toWishlistItem(await database.collection("wishlistItems").findOneAndDelete({ userId, productId }));
}

module.exports = {
  countOtherWishlistItems,
  createWishlistItem,
  deleteWishlistItem,
  findWishlistItem,
  listWishlistItemsForUser,
};
