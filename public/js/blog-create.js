const blogCreateForm = document.querySelector("#blog-create-form");
const formMessage = document.querySelector("#form-message");
const titleInput = document.querySelector("#post-title");
const categoryInput = document.querySelector("#post-category");
const tagsInput = document.querySelector("#post-tags");
const summaryInput = document.querySelector("#post-summary");
const imageInput = document.querySelector("#post-image");
const contentInput = document.querySelector("#post-content");
const clearDraftButton = document.querySelector("#clear-draft");
const titleCount = document.querySelector("#title-count");
const summaryCount = document.querySelector("#summary-count");
const contentCount = document.querySelector("#content-count");
const draftStorageKey = blogCreateForm.dataset.draftKey;

const formFields = [
  titleInput,
  categoryInput,
  tagsInput,
  summaryInput,
  imageInput,
  contentInput,
];

function showFieldError(input, message) {
  const errorElement = document.querySelector(`#${input.id.replace("post-", "")}-error`);
  errorElement.textContent = message;
  input.classList.toggle("input-error", message !== "");
  return message === "";
}

function validateTitle() {
  const length = titleInput.value.trim().length;
  const message = length >= 5 && length <= 100
    ? ""
    : "Enter a title containing 5-100 characters.";
  return showFieldError(titleInput, message);
}

function validateCategory() {
  return showFieldError(categoryInput, categoryInput.value ? "" : "Select a category.");
}

function validateTags() {
  const tags = tagsInput.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const isValid = tags.length >= 1 && tags.length <= 5 && tags.every((tag) => tag.length <= 25);
  return showFieldError(tagsInput, isValid ? "" : "Enter 1-5 tags, up to 25 characters each.");
}

function validateSummary() {
  const length = summaryInput.value.trim().length;
  const message = length >= 20 && length <= 250
    ? ""
    : "Enter a summary containing 20-250 characters.";
  return showFieldError(summaryInput, message);
}

function validateImage() {
  return showFieldError(imageInput, imageInput.value ? "" : "Select a cover image.");
}

function validateContent() {
  const length = contentInput.value.trim().length;
  const message = length >= 50 && length <= 5000
    ? ""
    : "Enter article content containing 50-5000 characters.";
  return showFieldError(contentInput, message);
}

function updateCharacterCounts() {
  titleCount.textContent = titleInput.value.length;
  summaryCount.textContent = summaryInput.value.length;
  contentCount.textContent = contentInput.value.length;
}

function saveDraft() {
  const draft = {
    title: titleInput.value,
    category: categoryInput.value,
    tags: tagsInput.value,
    summary: summaryInput.value,
    image: imageInput.value,
    content: contentInput.value,
  };

  localStorage.setItem(draftStorageKey, JSON.stringify(draft));
}

function loadDraft() {
  const savedDraft = localStorage.getItem(draftStorageKey);

  if (!savedDraft || blogCreateForm.dataset.loadDraft !== "true") {
    updateCharacterCounts();
    return;
  }

  try {
    const draft = JSON.parse(savedDraft);
    titleInput.value = draft.title || "";
    categoryInput.value = draft.category || "";
    tagsInput.value = draft.tags || "";
    summaryInput.value = draft.summary || "";
    imageInput.value = draft.image || "";
    contentInput.value = draft.content || "";
  } catch {
    localStorage.removeItem(draftStorageKey);
  }

  updateCharacterCounts();
}

const validationFunctions = {
  "post-title": validateTitle,
  "post-category": validateCategory,
  "post-tags": validateTags,
  "post-summary": validateSummary,
  "post-image": validateImage,
  "post-content": validateContent,
};

formFields.forEach(function (field) {
  const eventName = field.tagName === "SELECT" ? "change" : "input";

  field.addEventListener(eventName, function () {
    validationFunctions[field.id]();
    updateCharacterCounts();
    saveDraft();
  });
});

clearDraftButton.addEventListener("click", function () {
  blogCreateForm.reset();
  localStorage.removeItem(draftStorageKey);
  formMessage.textContent = clearDraftButton.textContent.includes("Reset")
    ? "Original values restored."
    : "Draft cleared.";

  formFields.forEach(function (field) {
    showFieldError(field, "");
  });

  updateCharacterCounts();
  titleInput.focus();
});

blogCreateForm.addEventListener("submit", function (event) {
  const validationResults = Object.values(validationFunctions).map((validate) => validate());

  if (validationResults.includes(false)) {
    event.preventDefault();
    formMessage.textContent = "Please correct the form errors before publishing.";
    return;
  }

  localStorage.removeItem(draftStorageKey);
});

loadDraft();
