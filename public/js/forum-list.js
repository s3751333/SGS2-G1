const controls = document.querySelector("#forum-controls");
const searchInput = document.querySelector("#forum-search");
const categoryFilter = document.querySelector("#category-filter");
const sortOrder = document.querySelector("#sort-order");
const resetButton = document.querySelector("#reset-forum");
const categoryButtons = document.querySelectorAll(".category-filter-button");
const topicList = document.querySelector("#topic-list");
const topics = [...topicList.querySelectorAll(".topic-row")];
const forumStatus = document.querySelector("#forum-status");
const emptyState = document.querySelector("#forum-empty");

function updateTopics() {
  const search = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const visibleTopics = topics.filter((topic) => {
    const matchesSearch = topic.dataset.search.includes(search);
    const matchesCategory = category === "all" || topic.dataset.category === category;
    topic.hidden = !(matchesSearch && matchesCategory);
    return !topic.hidden;
  });

  visibleTopics.sort((topicA, topicB) => {
    if (sortOrder.value === "title") {
      return topicA.dataset.title.localeCompare(topicB.dataset.title);
    }

    if (sortOrder.value === "oldest") {
      return new Date(topicA.dataset.created) - new Date(topicB.dataset.created);
    }

    return new Date(topicB.dataset.recent) - new Date(topicA.dataset.recent);
  });

  visibleTopics.forEach((topic) => topicList.append(topic));
  forumStatus.textContent = `${visibleTopics.length} ${visibleTopics.length === 1 ? "discussion" : "discussions"} found.`;
  emptyState.hidden = visibleTopics.length !== 0;
}

controls.addEventListener("submit", (event) => {
  event.preventDefault();
  updateTopics();
});
searchInput.addEventListener("input", updateTopics);
categoryFilter.addEventListener("change", updateTopics);
sortOrder.addEventListener("change", updateTopics);
categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryFilter.value = button.dataset.category;
    updateTopics();
  });
});
resetButton.addEventListener("click", () => {
  controls.reset();
  updateTopics();
});
