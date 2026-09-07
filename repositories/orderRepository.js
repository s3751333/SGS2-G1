function publicOrder(document) {
  if (!document) return null;
  const { _id, userId, requestKey, deletedAt, ...order } = document;
  return { id: _id, ...order };
}

async function listOrders(database, userId) {
  const orders = await database.collection("orders").find({ userId, deletedAt: { $exists: false } }).sort({ createdAt: -1, _id: -1 }).toArray();
  return orders.map(publicOrder);
}

async function findOrder(database, userId, orderId, options = {}) {
  return database.collection("orders").findOne({ _id: orderId, userId, deletedAt: { $exists: false } }, options);
}

module.exports = { publicOrder, listOrders, findOrder };
