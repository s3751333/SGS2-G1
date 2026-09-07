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
const dateBasis = document.querySelector("#date-basis");
const dateFrom = document.querySelector("#date-from");
const dateTo = document.querySelector("#date-to");

function updateTopics() {
  const search = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const visibleTopics = topics.filter((topic) => {
    const matchesSearch = topic.dataset.search.includes(search);
    const matchesCategory = category === "all" || topic.dataset.category === category;
    const postDate = new Date(topic.dataset[dateBasis.value]);
    const localDate = [postDate.getFullYear(), String(postDate.getMonth() + 1).padStart(2, "0"), String(postDate.getDate()).padStart(2, "0")].join("-");
    const matchesDate = (!dateFrom.value || localDate >= dateFrom.value) && (!dateTo.value || localDate <= dateTo.value);
    topic.hidden = !(matchesSearch && matchesCategory && matchesDate);
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
[dateBasis, dateFrom, dateTo].forEach((control) => control.addEventListener("change", updateTopics));
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
updateTopics();
