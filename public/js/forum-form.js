const topicForm = document.querySelector("#topic-form");
const topicCategory = document.querySelector("#topic-category");
const topicTitle = document.querySelector("#topic-title");
const topicMessage = document.querySelector("#topic-message");
const topicImage = document.querySelector("#topic-image");
const formMessage = document.querySelector("#form-message");
const clearDraftButton = document.querySelector("#clear-topic-draft");
const draftKey = topicForm.dataset.draftKey;
const originalValues = {
  category: topicCategory.value,
  title: topicTitle.value,
  content: topicMessage.value,
  image: topicImage.value,
};

function showFieldError(field, errorElement, message) {
  field.classList.toggle("input-error", Boolean(message));
  errorElement.textContent = message;
  return message === "";
}

function validateCategory() {
  return showFieldError(topicCategory, document.querySelector("#category-error"), topicCategory.value ? "" : "Choose a category.");
}

function validateTitle() {
  const length = topicTitle.value.trim().length;
  const message = length < 5 || length > 100 ? "Use between 5 and 100 characters." : "";
  return showFieldError(topicTitle, document.querySelector("#title-error"), message);
}

function validateMessage() {
  const length = topicMessage.value.trim().length;
  const message = length < 20 || length > 2000 ? "Use between 20 and 2000 characters." : "";
  return showFieldError(topicMessage, document.querySelector("#content-error"), message);
}

function validateImage() {
  return showFieldError(topicImage, document.querySelector("#image-error"), topicImage.value ? "" : "Choose an image.");
}

function updateCounts() {
  document.querySelector("#title-count").textContent = topicTitle.value.length;
  document.querySelector("#message-count").textContent = topicMessage.value.length;
}

function getValues() {
  return {
    category: topicCategory.value,
    title: topicTitle.value,
    content: topicMessage.value,
    image: topicImage.value,
  };
}

function setValues(values) {
  topicCategory.value = values.category || "";
  topicTitle.value = values.title || "";
  topicMessage.value = values.content || "";
  topicImage.value = values.image || "";
  updateCounts();
}

function saveDraft() {
  localStorage.setItem(draftKey, JSON.stringify(getValues()));
}

if (topicForm.dataset.loadDraft === "true") {
  const savedDraft = localStorage.getItem(draftKey);
  if (savedDraft) setValues(JSON.parse(savedDraft));
}

updateCounts();
topicCategory.addEventListener("change", () => { validateCategory(); saveDraft(); });
topicTitle.addEventListener("input", () => { updateCounts(); validateTitle(); saveDraft(); });
topicMessage.addEventListener("input", () => { updateCounts(); validateMessage(); saveDraft(); });
topicImage.addEventListener("change", () => { validateImage(); saveDraft(); });
clearDraftButton.addEventListener("click", () => {
  localStorage.removeItem(draftKey);
  setValues(originalValues);
  formMessage.textContent = "Draft cleared.";
});

topicForm.addEventListener("submit", (event) => {
  const isValid = [validateCategory(), validateTitle(), validateMessage(), validateImage()].every(Boolean);
  if (!isValid) {
    event.preventDefault();
    formMessage.textContent = "Please correct the form errors.";
    return;
  }
  localStorage.removeItem(draftKey);
});
