(function () {
  "use strict";

  const store = window.BookNookStore;
  const itemsContainer = document.querySelector("#cart-items");
  const emptyState = document.querySelector("#cart-empty");
  const subtotalElement = document.querySelector("#cart-subtotal");
  const totalElement = document.querySelector("#cart-total");
  const checkoutLink = document.querySelector("#checkout-link");
  const clearButton = document.querySelector("#clear-cart-button");

  function render() {
    const items = store.getCartDetails();
    itemsContainer.replaceChildren();

    items.forEach(({ product, quantity, lineTotal, available }) => {
      const item = document.createElement("article");
      item.className = "cart-item";
      item.dataset.productId = product.id;
      item.innerHTML = `
        <img src="${store.escapeHtml(product.image)}" alt="${store.escapeHtml(product.name)}">
        <div class="item-info">
          <h2>${store.escapeHtml(product.name)}</h2>
          <p>${store.formatCurrency(product.price)}</p>
          <p class="item-stock">In stock: ${store.escapeHtml(product.stock)}</p>
          ${available ? "" : '<p role="status">This quantity is unavailable. Reduce it or remove the item.</p>'}
          <button class="remove-link" type="button" data-cart-action="remove">Remove</button>
        </div>
        <div class="quantity" aria-label="Quantity for ${store.escapeHtml(product.name)}">
          <button type="button" data-cart-action="decrease" aria-label="Decrease quantity">&minus;</button>
          <span aria-live="polite">${quantity}</span>
          <button type="button" data-cart-action="increase" aria-label="Increase quantity" ${quantity >= Math.min(product.stock, 99) ? "disabled" : ""}>+</button>
        </div>
        <strong class="item-total">${store.formatCurrency(lineTotal)}</strong>`;
      itemsContainer.append(item);
    });

    const subtotal = store.getSubtotal();
    subtotalElement.textContent = store.formatCurrency(subtotal);
    totalElement.textContent = store.formatCurrency(subtotal);
    emptyState.hidden = items.length > 0;
    itemsContainer.hidden = items.length === 0;
    const cannotCheckout = items.length === 0 || items.some((item) => !item.available);
    checkoutLink.classList.toggle("disabled", cannotCheckout);
    checkoutLink.setAttribute("aria-disabled", String(cannotCheckout));
    clearButton.disabled = items.length === 0;
  }

  itemsContainer.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-cart-action]");
    const item = event.target.closest("[data-product-id]");
    if (!button || !item) return;

    const cartItem = store.getCart().find((entry) => entry.productId === item.dataset.productId);
    if (!cartItem) return;

    button.disabled = true;
    try {
      if (button.dataset.cartAction === "increase") await store.updateQuantity(cartItem.productId, cartItem.quantity + 1);
      if (button.dataset.cartAction === "decrease") await store.updateQuantity(cartItem.productId, cartItem.quantity - 1);
      if (button.dataset.cartAction === "remove") await store.removeItem(cartItem.productId);
      render();
    } catch (error) {
      window.alert(error.message);
      button.disabled = false;
    }
  });

  checkoutLink.addEventListener("click", (event) => {
    if (checkoutLink.getAttribute("aria-disabled") === "true") event.preventDefault();
  });

  clearButton.addEventListener("click", async () => {
    clearButton.disabled = true;
    try {
      await store.clearCart();
      render();
    } catch (error) {
      window.alert(error.message);
      clearButton.disabled = false;
    }
  });

  store.ready.then(render).catch((error) => window.alert(error.message));
})();
