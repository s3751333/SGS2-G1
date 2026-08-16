(function () {
  "use strict";

  const store = window.BookNookStore;
  const searchInput = document.querySelector("#shop-search");
  const categorySelect = document.querySelector("#shop-category");
  const searchButton = document.querySelector(".shop-tools button");
  const cards = [...document.querySelectorAll(".product-card")];
  const resultsMessage = document.querySelector("#shop-results-message");

  function filterProducts() {
    const query = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    let visibleCount = 0;

    cards.forEach((card) => {
      const matchesText = card.dataset.search.includes(query);
      const matchesCategory = category === "all" || card.dataset.category === category;
      const visible = matchesText && matchesCategory;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    document.querySelectorAll(".product-grid").forEach((grid) => {
      const hasVisibleCard = Boolean(grid.querySelector(".product-card:not([hidden])"));
      grid.hidden = !hasVisibleCard;
      if (grid.previousElementSibling?.classList.contains("section-title")) {
        grid.previousElementSibling.hidden = !hasVisibleCard;
      }
    });

    resultsMessage.textContent = visibleCount
      ? `${visibleCount} product${visibleCount === 1 ? "" : "s"} found.`
      : "No products match your search.";
  }

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-to-cart]");
    if (!addButton) return;
    event.preventDefault();

    store.addItem(addButton.dataset.addToCart, 1);
    const originalText = addButton.innerHTML;
    addButton.innerHTML = '<i class="fas fa-check"></i> Added';
    addButton.classList.add("added");
    window.setTimeout(() => {
      addButton.innerHTML = originalText;
      addButton.classList.remove("added");
    }, 1200);
  });

  searchButton.addEventListener("click", filterProducts);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") filterProducts();
  });
  searchInput.addEventListener("input", filterProducts);
  categorySelect.addEventListener("change", filterProducts);
})();
