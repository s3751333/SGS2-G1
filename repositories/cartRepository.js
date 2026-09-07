async function ensureCart(database, userId) {
  try {
    await database.collection("carts").updateOne(
      { _id: userId },
      { $setOnInsert: { userId, items: [], version: 0, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
}

async function findCart(database, userId, options = {}) {
  return database.collection("carts").findOne({ _id: userId }, options);
}

async function replaceCartItems(database, cart, items, options = {}) {
  return database.collection("carts").updateOne(
    { _id: cart._id, version: cart.version },
    { $set: { items, updatedAt: new Date() }, $inc: { version: 1 } },
    options,
  );
}

module.exports = { ensureCart, findCart, replaceCartItems };
