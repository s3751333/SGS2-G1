const crypto = require("node:crypto");
const express = require("express");
const { requireApiLogin } = require("../middleware/auth");

const MAX_CART_QUANTITY = 99;

function getCheckoutData(body) {
  return {
    customer: {
      fullName: String(body.customer?.fullName || body.fullName || "").trim(),
      email: String(body.customer?.email || body.email || "").trim().toLowerCase(),
      phone: String(body.customer?.phone || body.phone || "").trim(),
      address: String(body.customer?.address || body.address || "").trim(),
      city: String(body.customer?.city || body.city || "").trim(),
      district: String(body.customer?.district || body.district || "").trim(),
      note: String(body.customer?.note || body.note || "").trim(),
    },
    payment: String(body.payment || "").trim(),
  };
}

function validateCheckout(data) {
  const errors = {};
  const { customer, payment } = data;
  const phoneDigits = customer.phone.replace(/\D/g, "");

  if (customer.fullName.length < 2 || customer.fullName.length > 80) errors.fullName = "Full name must contain between 2 and 80 characters.";
  if (customer.email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.email = "Enter a valid email address.";
  if (!/^\+?[0-9 ]+$/.test(customer.phone) || phoneDigits.length < 9 || phoneDigits.length > 15) errors.phone = "Phone number must contain 9 to 15 digits; spaces and + are allowed.";
  if (customer.address.length < 5 || customer.address.length > 150) errors.address = "Address must contain between 5 and 150 characters.";
  if (customer.city.length < 2 || customer.city.length > 60) errors.city = "City / Province must contain between 2 and 60 characters.";
  if (customer.district.length < 2 || customer.district.length > 60) errors.district = "District must contain between 2 and 60 characters.";
  if (customer.note.length > 300) errors.note = "Order note cannot exceed 300 characters.";
  if (!["cod", "bank"].includes(payment)) errors.payment = "Select a valid payment method.";
  return errors;
}

function getValidQuantity(value) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_CART_QUANTITY
    ? quantity
    : null;
}

function getPublicOrder(order) {
  const { userId, ...publicOrder } = order;
  return publicOrder;
}

function createCartRouter({ products, cartService }) {
  const router = express.Router();
  const orders = [];

  router.get("/api/cart", requireApiLogin, (request, response) => {
    response.json(cartService.serializeCart(request.currentUser.id));
  });

  router.post("/api/cart/items", requireApiLogin, (request, response) => {
    const productId = String(request.body.productId || "");
    const quantity = getValidQuantity(request.body.quantity);
    const product = products.find((item) => item.id === productId);

    if (!product) {
      response.status(404).json({ message: "Product not found." });
      return;
    }
    if (quantity === null) {
      response.status(400).json({ message: `Quantity must be a whole number between 1 and ${MAX_CART_QUANTITY}.` });
      return;
    }

    const cart = cartService.getUserCart(request.currentUser.id);
    const existingItem = cart.find((item) => item.productId === productId);
    const nextQuantity = (existingItem?.quantity || 0) + quantity;
    const allowedQuantity = Math.min(MAX_CART_QUANTITY, Math.max(0, Number(product.stock) || 0));

    if (nextQuantity > allowedQuantity) {
      response.status(409).json({ message: `Only ${allowedQuantity} unit(s) of ${product.name} are available.` });
      return;
    }

    if (existingItem) existingItem.quantity = nextQuantity;
    else cart.push({ productId, quantity });
    response.status(201).json(cartService.serializeCart(request.currentUser.id));
  });

  router.patch("/api/cart/items/:productId", requireApiLogin, (request, response) => {
    const cart = cartService.getUserCart(request.currentUser.id);
    const item = cart.find((entry) => entry.productId === request.params.productId);
    const quantity = getValidQuantity(request.body.quantity);
    const product = products.find((entry) => entry.id === request.params.productId);

    if (!item || !product) {
      response.status(404).json({ message: "This product is not in your cart." });
      return;
    }
    if (quantity === null) {
      response.status(400).json({ message: `Quantity must be a whole number between 1 and ${MAX_CART_QUANTITY}.` });
      return;
    }
    if (quantity > product.stock) {
      response.status(409).json({ message: `Only ${product.stock} unit(s) of ${product.name} are available.` });
      return;
    }

    item.quantity = quantity;
    response.json(cartService.serializeCart(request.currentUser.id));
  });

  router.delete("/api/cart/items/:productId", requireApiLogin, (request, response) => {
    const cart = cartService.getUserCart(request.currentUser.id);
    const itemIndex = cart.findIndex((item) => item.productId === request.params.productId);

    if (itemIndex === -1) {
      response.status(404).json({ message: "This product is not in your cart." });
      return;
    }

    cart.splice(itemIndex, 1);
    response.json(cartService.serializeCart(request.currentUser.id));
  });

  router.delete("/api/cart", requireApiLogin, (request, response) => {
    cartService.clearCart(request.currentUser.id);
    response.json(cartService.serializeCart(request.currentUser.id));
  });

  router.get("/api/orders", requireApiLogin, (request, response) => {
    response.json({
      orders: orders
        .filter((order) => order.userId === request.currentUser.id)
        .map(getPublicOrder),
    });
  });

  router.get("/api/orders/:orderId", requireApiLogin, (request, response) => {
    const order = orders.find((item) => item.id === request.params.orderId && item.userId === request.currentUser.id);

    if (!order) {
      response.status(404).json({ message: "Order not found." });
      return;
    }

    response.json({ order: getPublicOrder(order) });
  });

  function createOrder(request, response) {
    const cart = cartService.serializeCart(request.currentUser.id);

    if (!cart.items.length) {
      response.status(400).json({ message: "Your cart is empty." });
      return;
    }

    const unavailableItem = cart.items.find(({ product, quantity }) => quantity > product.stock);
    if (unavailableItem) {
      response.status(409).json({
        message: `Only ${unavailableItem.product.stock} unit(s) of ${unavailableItem.product.name} are available.`,
      });
      return;
    }

    const checkoutData = getCheckoutData(request.body);
    const errors = validateCheckout(checkoutData);

    if (Object.keys(errors).length) {
      response.status(400).json({ message: "Please correct the checkout information.", errors });
      return;
    }

    const order = {
      id: `BN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      userId: request.currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customer: checkoutData.customer,
      payment: checkoutData.payment,
      items: cart.items.map(({ product, quantity, lineTotal }) => ({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        lineTotal,
      })),
      subtotal: cart.subtotal,
      shipping: cart.shipping,
      total: cart.total,
      status: "confirmed",
    };

    orders.push(order);
    cartService.clearCart(request.currentUser.id);
    response.status(201).json({ order: getPublicOrder(order) });
  }

  router.post("/api/orders", requireApiLogin, createOrder);
  router.post("/checkout", requireApiLogin, createOrder);

  router.patch("/api/orders/:orderId", requireApiLogin, (request, response) => {
    const order = orders.find((item) => item.id === request.params.orderId && item.userId === request.currentUser.id);

    if (!order) {
      response.status(404).json({ message: "Order not found." });
      return;
    }
    if (order.status !== "confirmed") {
      response.status(409).json({ message: "Only confirmed orders can be updated." });
      return;
    }

    const checkoutData = getCheckoutData({
      customer: { ...order.customer, ...(request.body.customer || {}) },
      payment: request.body.payment ?? order.payment,
    });
    const errors = validateCheckout(checkoutData);

    if (Object.keys(errors).length) {
      response.status(400).json({ message: "Please correct the order information.", errors });
      return;
    }

    order.customer = checkoutData.customer;
    order.payment = checkoutData.payment;
    order.updatedAt = new Date().toISOString();
    response.json({ order: getPublicOrder(order) });
  });

  router.delete("/api/orders/:orderId", requireApiLogin, (request, response) => {
    const orderIndex = orders.findIndex(
      (item) => item.id === request.params.orderId && item.userId === request.currentUser.id,
    );

    if (orderIndex === -1) {
      response.status(404).json({ message: "Order not found." });
      return;
    }

    orders.splice(orderIndex, 1);
    response.status(204).end();
  });

  return router;
}

module.exports = { createCartRouter };
