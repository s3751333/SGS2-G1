(function () {
  "use strict";

  const products = [
    { id: "harry-potter", name: "Harry Potter and the Sorcerer's Stone", price: 150000, image: "/img/harry_potter.jpg", category: "fiction" },
    { id: "little-prince", name: "The Little Prince", price: 100000, image: "/img/little_prince.jpg", category: "fiction" },
    { id: "english-grammar", name: "English Grammar in Use", price: 180000, image: "/img/eng_use.jpg", category: "reference" },
    { id: "catan", name: "Catan", price: 200000, image: "/img/catan_bg.jpg", category: "board-games" },
    { id: "monopoly", name: "Monopoly", price: 350000, image: "/img/monopoly.jpg", category: "board-games" },
    { id: "uno", name: "Uno", price: 100000, image: "/img/uno.jpg", category: "board-games" },
    { id: "norwegian-wood", name: "Norwegian Wood", price: 135000, image: "/img/norwey_wood.jpg", category: "fiction" },
    { id: "atomic-habits", name: "Atomic Habits", price: 175000, image: "/img/atomic_book.webp", category: "self-help" },
  ];
  let cart = { items: [], itemCount: 0, subtotal: 0, shipping: 0, total: 0 };

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    const data = response.status === 204 ? null : await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data?.message || data?.error || "The request could not be completed.");
      error.status = response.status;
      error.errors = data?.errors || {};
      throw error;
    }

    return data;
  }

  function saveCart(nextCart) {
    cart = nextCart;
    window.dispatchEvent(new CustomEvent("booknook:cart-changed", { detail: cart }));
    return cart;
  }

  async function loadCart() {
    try {
      return saveCart(await request("/api/cart"));
    } catch (error) {
      if (error.status === 401) return cart;
      throw error;
    }
  }

  function redirectToLogin(error) {
    if (error.status !== 401) throw error;
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    return null;
  }

  async function addItem(productId, quantity = 1) {
    await ready;
    try {
      return saveCart(await request("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId, quantity }),
      }));
    } catch (error) {
      return redirectToLogin(error);
    }
  }

  async function updateQuantity(productId, quantity) {
    await ready;
    if (Number(quantity) <= 0) return removeItem(productId);
    try {
      return saveCart(await request(`/api/cart/items/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      }));
    } catch (error) {
      return redirectToLogin(error);
    }
  }

  async function removeItem(productId) {
    await ready;
    try {
      return saveCart(await request(`/api/cart/items/${encodeURIComponent(productId)}`, { method: "DELETE" }));
    } catch (error) {
      return redirectToLogin(error);
    }
  }

  async function clearCart() {
    await ready;
    try {
      return saveCart(await request("/api/cart", { method: "DELETE" }));
    } catch (error) {
      return redirectToLogin(error);
    }
  }

  async function createOrder(customer, payment) {
    await ready;
    try {
      const result = await request("/api/orders", {
        method: "POST",
        body: JSON.stringify({ customer, payment }),
      });
      saveCart({ items: [], itemCount: 0, subtotal: 0, shipping: 0, total: 0 });
      return result.order;
    } catch (error) {
      if (error.status === 401) return redirectToLogin(error);
      throw error;
    }
  }

  function getProduct(productId) {
    return products.find((product) => product.id === productId) || null;
  }

  function formatCurrency(value) {
    return `${new Intl.NumberFormat("vi-VN").format(value)} VND`;
  }

  const ready = loadCart();
  window.BookNookStore = {
    products,
    ready,
    addItem,
    clearCart,
    createOrder,
    formatCurrency,
    getCart: () => cart.items.map(({ productId, quantity }) => ({ productId, quantity })),
    getCartDetails: () => cart.items,
    getItemCount: () => cart.itemCount,
    getProduct,
    getSubtotal: () => cart.subtotal,
    removeItem,
    updateQuantity,
  };
})();
