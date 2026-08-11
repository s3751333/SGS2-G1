const blogList = document.querySelector("#blog-list");
const blogStatus = document.querySelector("#blog-status");
const blogControls = document.querySelector("#blog-controls");
const searchInput = document.querySelector("#blog-search");
const categoryFilter = document.querySelector("#category-filter");
const sortOrder = document.querySelector("#sort-order");
const filterStorageKey = "booknookBlogFilters";
let allPosts = [];

function createBlogCard(post) {
  const formattedDate = new Date(post.date).toLocaleDateString("en-AU");

  return `
    <article class="card">
      <div class="card-image">
        <img src="${post.image}" alt="${post.title}">
      </div>
      <h3>${post.title}</h3>
      <p class="card-meta">By ${post.author} · ${post.category}</p>
      <p>${post.summary}</p>
      <div class="card-footer">
        <span>${formattedDate}</span>
        <a href="blog-articles/blog${post.id}.html" class="btn-read">Read</a>
      </div>
    </article>
  `;
}

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
    const filters = JSON.parse(savedFilters);
    searchInput.value = filters.search || "";
    categoryFilter.value = filters.category || "all";
    sortOrder.value = filters.sort || "newest";
  }
}

function showFilteredPosts() {
  const searchText = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;

  const filteredPosts = allPosts.filter((post) => {
    const searchableText = [
      post.title,
      post.author,
      post.date,
      post.category,
      post.tags.join(" "),
      post.summary,
      post.content,
    ].join(" ").toLowerCase();

    const matchesSearch = searchableText.includes(searchText);
    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  filteredPosts.sort((firstPost, secondPost) => {
    if (sortOrder.value === "oldest") {
      return new Date(firstPost.date) - new Date(secondPost.date);
    }
    if (sortOrder.value === "title") {
      return firstPost.title.localeCompare(secondPost.title);
    }
    if (sortOrder.value === "author") {
      return firstPost.author.localeCompare(secondPost.author);
    }
    return new Date(secondPost.date) - new Date(firstPost.date);
  });

  blogList.innerHTML = filteredPosts.map(createBlogCard).join("");
  blogStatus.textContent = `${filteredPosts.length} blog posts found.`;
  saveFilters();
}

async function loadBlogPosts() {
  try {
    const response = await fetch("/blogs-data");
    allPosts = await response.json();
    loadFilters();
    showFilteredPosts();
  } catch {
    blogStatus.textContent = "Could not load the blog posts.";
  }
}

blogControls.addEventListener("submit", function (event) {
  event.preventDefault();
  showFilteredPosts();
});
searchInput.addEventListener("input", showFilteredPosts);
categoryFilter.addEventListener("change", showFilteredPosts);
sortOrder.addEventListener("change", showFilteredPosts);

loadBlogPosts();
