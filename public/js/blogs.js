const blogList = document.querySelector("#blog-list");
const blogStatus = document.querySelector("#blog-status");
const blogControls = document.querySelector("#blog-controls");
const searchInput = document.querySelector("#blog-search");
const categoryFilter = document.querySelector("#category-filter");
const sortOrder = document.querySelector("#sort-order");
const resetFiltersButton = document.querySelector("#reset-filters");
const filterStorageKey = "booknookBlogFiltersV2";
const blogCards = Array.from(blogList.querySelectorAll(".card"));

localStorage.removeItem("booknookBlogFilters");

function saveFilters() {
  const filters = {
    search: searchInput.value,
    category: categoryFilter.value,
    sort: sortOrder.value,
  };

  localStorage.setItem(filterStorageKey, JSON.stringify(filters));
}

function loadFilters() {
  const savedFilters = localStorage.getItem(filterStorageKey);

  if (savedFilters) {
    try {
      const filters = JSON.parse(savedFilters);
      searchInput.value = filters.search || "";
      categoryFilter.value = filters.category || "all";
      sortOrder.value = filters.sort || "newest";
    } catch {
      localStorage.removeItem(filterStorageKey);
    }
  }
}

function showFilteredPosts() {
  const searchText = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;

  const sortedCards = [...blogCards].sort((firstCard, secondCard) => {
    if (sortOrder.value === "oldest") {
      return new Date(firstCard.dataset.date) - new Date(secondCard.dataset.date);
    }
    if (sortOrder.value === "title") {
      return firstCard.dataset.title.localeCompare(secondCard.dataset.title);
    }
    if (sortOrder.value === "author") {
      return firstCard.dataset.author.localeCompare(secondCard.dataset.author);
    }
    return new Date(secondCard.dataset.date) - new Date(firstCard.dataset.date);
  });

  let visiblePostCount = 0;

  sortedCards.forEach((card) => {
    const matchesSearch = card.dataset.search.includes(searchText);
    const matchesCategory = selectedCategory === "all" || card.dataset.category === selectedCategory;
    const isVisible = matchesSearch && matchesCategory;

    card.hidden = !isVisible;
    blogList.appendChild(card);

    if (isVisible) {
      visiblePostCount += 1;
    }
  });

  blogStatus.textContent = `${visiblePostCount} blog posts found.`;
  saveFilters();
}

blogControls.addEventListener("submit", function (event) {
  event.preventDefault();
  showFilteredPosts();
});
searchInput.addEventListener("input", showFilteredPosts);
categoryFilter.addEventListener("change", showFilteredPosts);
sortOrder.addEventListener("change", showFilteredPosts);
resetFiltersButton.addEventListener("click", function () {
  searchInput.value = "";
  categoryFilter.value = "all";
  sortOrder.value = "newest";
  localStorage.removeItem(filterStorageKey);
  showFilteredPosts();
  searchInput.focus();
});

loadFilters();
showFilteredPosts();
