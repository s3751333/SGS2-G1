function createCartService(products) {
  const cartsByUserId = new Map();

  function getUserCart(userId) {
    if (!cartsByUserId.has(userId)) cartsByUserId.set(userId, []);
    return cartsByUserId.get(userId);
  }

  function clearCart(userId) {
    cartsByUserId.set(userId, []);
  }

  function serializeCart(userId) {
    const items = getUserCart(userId)
      .map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return product ? { ...item, product, lineTotal: product.price * item.quantity } : null;
      })
      .filter(Boolean);
    const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);

    return {
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      subtotal,
      shipping: 0,
      total: subtotal,
    };
  }

  return { clearCart, getUserCart, serializeCart };
}

module.exports = { createCartService };
