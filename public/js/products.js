(function () {
  "use strict";

  const store = window.BookNookStore;
  const productGrid = document.querySelector("#product-grid");
  const shopControls = document.querySelector("#shop-controls");
  const searchInput = document.querySelector("#shop-search");
  const categorySelect = document.querySelector("#shop-category");
  const sortSelect = document.querySelector("#shop-sort");
  const resetButton = document.querySelector("#reset-shop-filters");
  const resultsMessage = document.querySelector("#shop-results-message");
  const filterStorageKey = "booknookShopFiltersV1";
  const productCards = [...productGrid.querySelectorAll(".product-card")];

  function saveFilters() {
    localStorage.setItem(
      filterStorageKey,
      JSON.stringify({
        search: searchInput.value,
        category: categorySelect.value,
        sort: sortSelect.value,
      }),
    );
  }

  function loadFilters() {
    const params = new URLSearchParams(window.location.search);

    // A direct link with query params (e.g. from a category card) always wins
    // over a previously saved filter set.
    if (params.has("q") || params.has("category") || params.has("sort")) {
      return;
    }

    const saved = localStorage.getItem(filterStorageKey);
    if (!saved) return;

    try {
      const filters = JSON.parse(saved);
      searchInput.value = filters.search || "";
      categorySelect.value = filters.category || "all";
      sortSelect.value = filters.sort || "recent";
    } catch {
      localStorage.removeItem(filterStorageKey);
    }
  }

  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    const sort = sortSelect.value;

    const sortedCards = [...productCards].sort((cardA, cardB) => {
      if (sort === "price-low") return Number(cardA.dataset.price) - Number(cardB.dataset.price);
      if (sort === "price-high") return Number(cardB.dataset.price) - Number(cardA.dataset.price);
      if (sort === "name") return cardA.dataset.name.localeCompare(cardB.dataset.name);
      if (sort === "rating") return Number(cardB.dataset.rating) - Number(cardA.dataset.rating);
      return 0;
    });

    let visibleCount = 0;

    sortedCards.forEach((card) => {
      const matchesText = card.dataset.search.includes(query);
      const matchesCategory = category === "all" || card.dataset.category === category;
      const isVisible = matchesText && matchesCategory;

      card.hidden = !isVisible;
      productGrid.appendChild(card);

      if (isVisible) visibleCount += 1;
    });

    resultsMessage.textContent = visibleCount
      ? `${visibleCount} product${visibleCount === 1 ? "" : "s"} found.`
      : "No products match your search.";

    saveFilters();
  }

  shopControls.addEventListener("submit", (event) => {
    event.preventDefault();
    applyFilters();
  });

  searchInput.addEventListener("input", applyFilters);
  categorySelect.addEventListener("change", applyFilters);
  sortSelect.addEventListener("change", applyFilters);

  resetButton.addEventListener("click", () => {
    searchInput.value = "";
    categorySelect.value = "all";
    sortSelect.value = "recent";
    localStorage.removeItem(filterStorageKey);
    applyFilters();
    searchInput.focus();
  });

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-to-cart]");
    if (!addButton || !store) return;
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

  loadFilters();
  applyFilters();
})();
