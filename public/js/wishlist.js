(function () {
  "use strict";

  const grid = document.querySelector("#wishlist-grid");
  const emptyState = document.querySelector("#wishlist-empty");
  const countElement = document.querySelector("[data-wishlist-count]");
  const sortSelect = document.querySelector("#sort-wishlist");
  const statusMessage = document.querySelector("#wishlist-status");

  function getCards() {
    return [...grid.querySelectorAll(".wishlist-card")];
  }

  function updateCount(count) {
    countElement.textContent = `${count} item${count === 1 ? "" : "s"}`;
    grid.hidden = count === 0;
    emptyState.hidden = count > 0;
  }

  function sortCards() {
    const sort = sortSelect.value;
    const cards = getCards().sort((first, second) => {
      if (sort === "price-low") return Number(first.dataset.price) - Number(second.dataset.price);
      if (sort === "price-high") return Number(second.dataset.price) - Number(first.dataset.price);
      if (sort === "name") return first.dataset.name.localeCompare(second.dataset.name);
      return new Date(second.dataset.addedAt) - new Date(first.dataset.addedAt);
    });

    cards.forEach((card) => grid.appendChild(card));
    const url = new URL(window.location.href);
    url.searchParams.set("sort", sort);
    window.history.replaceState({}, "", url);
    statusMessage.textContent = `Wishlist sorted by ${sortSelect.options[sortSelect.selectedIndex].text}.`;
  }

  async function request(url, method) {
    const response = await fetch(url, {
      method,
      headers: { Accept: "application/json" },
    });

    if (response.redirected && response.url.includes("/login")) {
      window.location.href = `/login?next=${encodeURIComponent("/wishlist")}`;
      return null;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || "The request could not be completed.");
    return data;
  }

  sortSelect.addEventListener("change", sortCards);

  grid.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-wishlist-action]");
    const card = event.target.closest("[data-product-id]");
    if (!button || !card) return;

    const productId = encodeURIComponent(card.dataset.productId);
    const action = button.dataset.wishlistAction;
    button.disabled = true;
    statusMessage.textContent = action === "move" ? "Moving item to your cart..." : "Removing item...";

    try {
      const data = action === "move"
        ? await request(`/wishlist/${productId}/move-to-cart`, "POST")
        : await request(`/wishlist/${productId}`, "DELETE");
      if (!data) return;

      card.remove();
      updateCount(data.count);

      if (action === "move") {
        statusMessage.textContent = "Item moved to your cart.";
        if (data.cart) {
          window.dispatchEvent(new CustomEvent("booknook:cart-changed", { detail: data.cart }));
        }
      } else {
        statusMessage.textContent = "Item removed from your wishlist.";
      }
    } catch (error) {
      statusMessage.textContent = error.message;
      button.disabled = false;
    }
  });

  updateCount(getCards().length);
})();
