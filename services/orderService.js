const { randomUUID } = require("node:crypto");
const { findCart, replaceCartItems } = require("../repositories/cartRepository");
const { findProductById } = require("../repositories/productRepository");
const { publicOrder, findOrder } = require("../repositories/orderRepository");
const { validateQuantity } = require("./cartService");
const { ShopError } = require("../utils/shopError");

function createOrderService(database) {
  async function transaction(work) {
    const session = database.client.startSession();
    try {
      return await session.withTransaction(() => work(session), {
        readConcern: { level: "snapshot" }, writeConcern: { w: "majority" },
      });
    } finally {
      await session.endSession();
    }
  }

  async function checkout(userId, checkoutData, requestKey = randomUUID()) {
    return transaction(async (session) => {
      const orders = database.collection("orders");
      const previous = await orders.findOne({ userId, requestKey }, { session });
      if (previous) {
        if (previous.deletedAt) throw new ShopError(409, "This checkout was already cancelled. Start a new checkout.");
        return publicOrder(previous);
      }
      const cart = await findCart(database, userId, { session });
      if (!cart?.items.length) throw new ShopError(400, "Your cart is empty.");
      const items = [];
      for (const entry of cart.items) {
        validateQuantity(entry.quantity);
        const product = await findProductById(database, entry.productId, { session });
        if (!product) throw new ShopError(409, "A product is no longer available. Please remove it from your cart.");
        if (!Number.isSafeInteger(product.price) || product.price < 0) throw new ShopError(409, `The price of ${product.name} is unavailable.`);
        const stock = await database.collection("products").updateOne(
          { _id: product.id, stock: { $gte: entry.quantity } },
          { $inc: { stock: -entry.quantity }, $set: { updatedAt: new Date() } },
          { session },
        );
        if (!stock.matchedCount) throw new ShopError(409, `Only ${product.stock} unit(s) of ${product.name} are available.`);
        items.push({ productId: product.id, name: product.name, price: product.price, quantity: entry.quantity, lineTotal: product.price * entry.quantity });
      }
      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      if (!Number.isSafeInteger(subtotal)) throw new ShopError(409, "The order total is too large.");
      const now = new Date();
      const order = {
        _id: `BN-${randomUUID().toUpperCase()}`, userId, requestKey,
        ...checkoutData, items, subtotal, shipping: 0, total: subtotal,
        status: "confirmed", paymentStatus: "pending", createdAt: now, updatedAt: now,
      };
      await orders.insertOne(order, { session });
      const result = await replaceCartItems(database, cart, [], { session });
      if (!result.matchedCount) throw new ShopError(409, "Your cart has changed. Please review it and try again.");
      return publicOrder(order);
    });
  }

  async function updateOrder(userId, orderId, changes) {
    const result = await database.collection("orders").findOneAndUpdate(
      { _id: orderId, userId, status: "confirmed", deletedAt: { $exists: false } },
      { $set: { ...changes, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) throw new ShopError(409, "This order can no longer be updated.");
    return publicOrder(result);
  }

  async function cancelOrder(userId, orderId) {
    return transaction(async (session) => {
      const order = await findOrder(database, userId, orderId, { session });
      if (!order) throw new ShopError(404, "Order not found.");
      if (order.status !== "confirmed") throw new ShopError(409, "Only confirmed orders can be cancelled.");
      for (const item of order.items) {
        await database.collection("products").updateOne(
          { _id: item.productId }, { $inc: { stock: item.quantity }, $set: { updatedAt: new Date() } }, { session },
        );
      }
      await database.collection("orders").updateOne(
        { _id: orderId, userId, status: "confirmed" },
        { $set: { status: "cancelled", deletedAt: new Date(), updatedAt: new Date() } }, { session },
      );
    });
  }

  return { checkout, updateOrder, cancelOrder };
}

module.exports = { createOrderService };
