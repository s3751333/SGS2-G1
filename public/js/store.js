(function () {
  "use strict";

  const CART_KEY = "booknook-cart-v1";
  const ORDERS_KEY = "booknook-orders-v1";
  const MAX_QUANTITY = 99;

  const products = [
    { id: "harry-potter", name: "Harry Potter and the Sorcerer's Stone", price: 150000, image: "/img/harry_potter.jpg", category: "fiction" },
    { id: "little-prince", name: "The Little Prince", price: 100000, image: "/img/little_prince.jpg", category: "fiction" },
    { id: "english-grammar", name: "English Grammar in Use", price: 180000, image: "/img/eng_use.jpg", category: "reference" },
    { id: "catan", name: "Catan", price: 200000, image: "/img/catan_bg.jpg", category: "board-games" },
    { id: "monopoly", name: "Monopoly", price: 350000, image: "/img/monopoly.jpg", category: "board-games" },
    { id: "uno", name: "Uno", price: 100000, image: "/img/uno.jpg", category: "board-games" },
  ];

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getProduct(productId) {
    return products.find((product) => product.id === productId) || null;
  }

  function getCart() {
    const savedCart = readJson(CART_KEY, []);
    if (!Array.isArray(savedCart)) return [];

    return savedCart
      .filter((item) => getProduct(item.productId))
      .map((item) => ({
        productId: item.productId,
        quantity: Math.min(MAX_QUANTITY, Math.max(1, Number(item.quantity) || 1)),
      }));
  }

  function saveCart(cart) {
    writeJson(CART_KEY, cart);
    window.dispatchEvent(new CustomEvent("booknook:cart-changed", { detail: cart }));
  }

  function addItem(productId, quantity) {
    if (!getProduct(productId)) return false;

    const amount = Math.min(MAX_QUANTITY, Math.max(1, Number(quantity) || 1));
    const cart = getCart();
    const existingItem = cart.find((item) => item.productId === productId);

    if (existingItem) {
      existingItem.quantity = Math.min(MAX_QUANTITY, existingItem.quantity + amount);
    } else {
      cart.push({ productId, quantity: amount });
    }

    saveCart(cart);
    return true;
  }

  function updateQuantity(productId, quantity) {
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) {
      removeItem(productId);
      return;
    }

    const cart = getCart();
    const item = cart.find((cartItem) => cartItem.productId === productId);
    if (!item) return;
    item.quantity = Math.min(MAX_QUANTITY, Math.floor(amount));
    saveCart(cart);
  }

  function removeItem(productId) {
    saveCart(getCart().filter((item) => item.productId !== productId));
  }

  function clearCart() {
    saveCart([]);
  }

  function getCartDetails() {
    return getCart().map((item) => {
      const product = getProduct(item.productId);
      return { ...item, product, lineTotal: product.price * item.quantity };
    });
  }

  function getItemCount() {
    return getCart().reduce((total, item) => total + item.quantity, 0);
  }

  function getSubtotal() {
    return getCartDetails().reduce((total, item) => total + item.lineTotal, 0);
  }

  function formatCurrency(value) {
    return `${new Intl.NumberFormat("vi-VN").format(value)} VND`;
  }

  function createOrder(customer, payment) {
    const items = getCartDetails();
    if (!items.length) return null;

    const order = {
      id: `BN-${Date.now().toString().slice(-8)}`,
      createdAt: new Date().toISOString(),
      customer,
      payment,
      items: items.map(({ product, quantity, lineTotal }) => ({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        lineTotal,
      })),
      subtotal: getSubtotal(),
      shipping: 0,
      status: "confirmed",
    };

    const orders = readJson(ORDERS_KEY, []);
    writeJson(ORDERS_KEY, Array.isArray(orders) ? [...orders, order] : [order]);
    clearCart();
    return order;
  }

  window.BookNookStore = {
    products,
    addItem,
    clearCart,
    createOrder,
    formatCurrency,
    getCart,
    getCartDetails,
    getItemCount,
    getProduct,
    getSubtotal,
    removeItem,
    updateQuantity,
  };
})();
