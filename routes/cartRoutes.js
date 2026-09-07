const express = require("express");
const { requireApiLogin } = require("../middleware/auth");
const { publicOrder, findOrder, listOrders } = require("../repositories/orderRepository");
const { createOrderService } = require("../services/orderService");
const { ShopError } = require("../utils/shopError");

function getCheckoutData(body = {}) {
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


function createCartRouter({ database, cartService }) {
  const router = express.Router();
  const orderService = createOrderService(database);

  router.get("/api/cart", requireApiLogin, async (request, response) => {
    response.json(await cartService.serializeCart(request.currentUser.id));
  });
  router.post("/api/cart/items", requireApiLogin, async (request, response) => {
    response.status(201).json(await cartService.addItem(request.currentUser.id, String(request.body?.productId || ""), request.body?.quantity));
  });
  router.patch("/api/cart/items/:productId", requireApiLogin, async (request, response) => {
    response.json(await cartService.updateQuantity(request.currentUser.id, request.params.productId, request.body?.quantity));
  });
  router.delete("/api/cart/items/:productId", requireApiLogin, async (request, response) => {
    response.json(await cartService.removeItem(request.currentUser.id, request.params.productId));
  });
  router.delete("/api/cart", requireApiLogin, async (request, response) => {
    response.json(await cartService.clearCart(request.currentUser.id));
  });
  router.get("/api/orders", requireApiLogin, async (request, response) => {
    response.json({ orders: await listOrders(database, request.currentUser.id) });
  });
  router.get("/api/orders/:orderId", requireApiLogin, async (request, response) => {
    const order = await findOrder(database, request.currentUser.id, request.params.orderId);
    if (!order) throw new ShopError(404, "Order not found.");
    response.json({ order: publicOrder(order) });
  });

  async function createOrder(request, response) {
    const checkoutData = getCheckoutData(request.body);
    const errors = validateCheckout(checkoutData);
    if (Object.keys(errors).length) throw new ShopError(400, "Please correct the checkout information.", errors);
    const requestKey = request.get("Idempotency-Key");
    if (requestKey !== undefined && !/^[a-zA-Z0-9_-]{8,128}$/.test(requestKey)) {
      throw new ShopError(400, "Invalid checkout request key.");
    }
    const order = await orderService.checkout(request.currentUser.id, checkoutData, requestKey);
    response.status(201).json({ order });
  }
  router.post("/api/orders", requireApiLogin, createOrder);
  router.post("/checkout", requireApiLogin, createOrder);

  router.patch("/api/orders/:orderId", requireApiLogin, async (request, response) => {
    const order = await findOrder(database, request.currentUser.id, request.params.orderId);
    if (!order) throw new ShopError(404, "Order not found.");
    const checkoutData = getCheckoutData({
      customer: { ...order.customer, ...(request.body?.customer || {}) },
      payment: request.body?.payment ?? order.payment,
    });
    const errors = validateCheckout(checkoutData);
    if (Object.keys(errors).length) throw new ShopError(400, "Please correct the order information.", errors);
    response.json({ order: await orderService.updateOrder(request.currentUser.id, order._id, checkoutData) });
  });
  router.delete("/api/orders/:orderId", requireApiLogin, async (request, response) => {
    await orderService.cancelOrder(request.currentUser.id, request.params.orderId);
    response.status(204).end();
  });

  return router;
}

module.exports = { createCartRouter };
