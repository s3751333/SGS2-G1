(function () {
  "use strict";

  const store = window.BookNookStore;
  const quantityValue = document.querySelector("[data-product-quantity]");
  const decreaseButton = document.querySelector("[data-quantity-decrease]");
  const increaseButton = document.querySelector("[data-quantity-increase]");
  const addButton = document.querySelector("[data-add-to-cart]");
  if (!quantityValue || !addButton) return;

  let quantity = 1;

  function renderQuantity() {
    quantityValue.textContent = quantity;
    decreaseButton.disabled = quantity === 1;
  }

  decreaseButton.addEventListener("click", () => {
    quantity = Math.max(1, quantity - 1);
    renderQuantity();
  });

  increaseButton.addEventListener("click", () => {
    quantity = Math.min(99, quantity + 1);
    renderQuantity();
  });

  addButton.addEventListener("click", (event) => {
    event.preventDefault();
    store.addItem(addButton.dataset.addToCart, quantity);
    addButton.innerHTML = '<i class="fas fa-check"></i> Added to Cart';
    window.setTimeout(() => {
      addButton.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
    }, 1400);
  });

  renderQuantity();
})();
