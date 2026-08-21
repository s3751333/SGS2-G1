(function () {
  "use strict";

  const store = window.BookNookStore;
  const grid = document.querySelector("#wishlist-grid");
  const emptyState = document.querySelector("#empty-wishlist");
  const countText = document.querySelector("[data-wishlist-count-text]");
  const sortSelect = document.querySelector("[data-wishlist-sort]");

  function updateCount() {
    const remaining = grid.querySelectorAll("[data-wishlist-card]").length;
    countText.innerHTML = `<strong>${remaining} item${remaining === 1 ? "" : "s"}</strong> saved to your wishlist`;

    if (remaining === 0) {
      grid.hidden = true;
      emptyState.hidden = false;
    }
  }

  function removeCard(productId) {
    const card = grid.querySelector(`[data-product-id="${productId}"]`);
    if (card) card.remove();
    updateCount();
  }

  grid.addEventListener("click", async (event) => {
    const removeButton = event.target.closest("[data-remove-wishlist]");
    const moveButton = event.target.closest("[data-move-to-cart]");

    if (removeButton) {
      const productId = removeButton.dataset.productId;
      removeButton.disabled = true;

      try {
        const response = await fetch(`/wishlist/${encodeURIComponent(productId)}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Request failed");
        removeCard(productId);
      } catch {
        window.alert("Could not remove this item. Please try again.");
        removeButton.disabled = false;
      }
      return;
    }

    if (moveButton) {
      const productId = moveButton.dataset.productId;
      moveButton.disabled = true;
      moveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Moving...';

      try {
        const response = await fetch(`/wishlist/${encodeURIComponent(productId)}/move-to-cart`, { method: "POST" });
        if (!response.ok) throw new Error("Request failed");

        if (store) store.addItem(productId, 1);
        removeCard(productId);
      } catch {
        window.alert("Could not move this item to your cart. Please try again.");
        moveButton.disabled = false;
        moveButton.innerHTML = '<i class="fas fa-cart-plus"></i> Move to Cart';
      }
    }
  });

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      const url = new URL(window.location.href);
      url.searchParams.set("sort", sortSelect.value);
      window.location.href = url.toString();
    });
  }
})();
