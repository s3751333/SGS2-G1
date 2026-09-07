const { ensureCart, findCart, replaceCartItems } = require("../repositories/cartRepository");
const { findProductById, listProducts } = require("../repositories/productRepository");
const { ShopError } = require("../utils/shopError");

const MAX_CART_QUANTITY = 99;

function validateQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CART_QUANTITY) {
    throw new ShopError(400, `Quantity must be a whole number between 1 and ${MAX_CART_QUANTITY}.`);
  }
}

function createCartService(database) {
  async function serializeCart(userId, options = {}) {
    const cart = await findCart(database, userId, options);
    const entries = cart?.items || [];
    const products = await listProducts(database, { _id: { $in: entries.map((item) => item.productId) } }, options);
    const items = entries.map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      const currentProduct = product || { id: item.productId, name: "Unavailable product", price: 0, stock: 0, image: "/img/book.jpg" };
      return { ...item, product: currentProduct, available: Boolean(product) && item.quantity <= product.stock, lineTotal: currentProduct.price * item.quantity };
    });
    const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);

    return {
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      subtotal,
      shipping: 0,
      total: subtotal,
    };
  }

  async function changeCart(userId, change) {
    await ensureCart(database, userId);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const cart = await findCart(database, userId);
      const items = await change(cart.items);
      const result = await replaceCartItems(database, cart, items);
      if (result.matchedCount) return serializeCart(userId);
    }
    throw new ShopError(409, "Your cart was changed in another request. Please try again.");
  }

  async function setItem(userId, productId, quantity, add) {
    validateQuantity(quantity);
    return changeCart(userId, async (items) => {
      const product = await findProductById(database, productId);
      if (!product) throw new ShopError(404, "Product not found.");
      const existing = items.find((item) => item.productId === productId);
      if (!add && !existing) throw new ShopError(404, "This product is not in your cart.");
      const nextQuantity = add ? (existing?.quantity || 0) + quantity : quantity;
      const allowedQuantity = Math.min(MAX_CART_QUANTITY, Math.max(0, product.stock));
      if (nextQuantity > allowedQuantity) throw new ShopError(409, `Only ${allowedQuantity} unit(s) of ${product.name} are available.`);
      if (existing) {
        return items.map((item) => item.productId === productId ? { ...item, quantity: nextQuantity } : item);
      }
      return [...items, { productId, quantity: nextQuantity }];
    });
  }

  return {
    serializeCart,
    addItem: (userId, productId, quantity) => setItem(userId, productId, quantity, true),
    updateQuantity: (userId, productId, quantity) => setItem(userId, productId, quantity, false),
    clearCart: (userId) => changeCart(userId, () => []),
    removeItem: (userId, productId) => changeCart(userId, (items) => {
      if (!items.some((item) => item.productId === productId)) throw new ShopError(404, "This product is not in your cart.");
      return items.filter((item) => item.productId !== productId);
    }),
  };
}

module.exports = { createCartService, validateQuantity };
