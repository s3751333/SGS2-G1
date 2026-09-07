const replyForm = document.querySelector("#reply-form");
const replyTitle = document.querySelector("#reply-title");
const replyMessage = document.querySelector("#reply-message");
const replyImage = document.querySelector("#reply-image");
const parentReplyId = document.querySelector("#parent-reply-id");
const formMessage = document.querySelector("#reply-form-message");
const clearDraftButton = document.querySelector("#clear-reply-draft");
const replyTargets = document.querySelectorAll(".reply-target");
const replyingTo = document.querySelector("#replying-to");
const originalDraft = {
  title: replyTitle.value,
  content: replyMessage.value,
  image: replyImage.value,
  parentReplyId: parentReplyId ? parentReplyId.value : "",
};

function showError(field, selector, message) {
  field.classList.toggle("input-error", Boolean(message));
  document.querySelector(selector).textContent = message;
  return message === "";
}

function validateReplyTitle() {
  const length = replyTitle.value.trim().length;
  return showError(replyTitle, "#reply-title-error", length < 3 || length > 100 ? "Use between 3 and 100 characters." : "");
}

function validateReplyMessage() {
  const length = replyMessage.value.trim().length;
  return showError(replyMessage, "#reply-content-error", length < 3 || length > 1000 ? "Use between 3 and 1000 characters." : "");
}

function validateReplyImage() {
  return showError(replyImage, "#reply-image-error", replyImage.value ? "" : "Choose an image.");
}

function updateCounts() {
  document.querySelector("#reply-title-count").textContent = replyTitle.value.length;
  document.querySelector("#reply-message-count").textContent = replyMessage.value.length;
}

function setDraft(draft) {
  replyTitle.value = draft.title || "";
  replyMessage.value = draft.content || "";
  replyImage.value = draft.image || "";
  if (parentReplyId) parentReplyId.value = draft.parentReplyId || "";
  if (parentReplyId && parentReplyId.value && replyingTo) {
    const target = document.querySelector(`[data-reply-id="${parentReplyId.value}"]`);
    if (target) {
      replyingTo.textContent = `Replying to ${target.dataset.replyAuthor}`;
      replyingTo.hidden = false;
    }
  }
  updateCounts();
}

updateCounts();
replyTitle.addEventListener("input", () => { updateCounts(); validateReplyTitle(); });
replyMessage.addEventListener("input", () => { updateCounts(); validateReplyMessage(); });
replyImage.addEventListener("change", () => { validateReplyImage(); });

replyTargets.forEach((button) => {
  button.addEventListener("click", () => {
    parentReplyId.value = button.dataset.replyId;
    replyingTo.textContent = `Replying to ${button.dataset.replyAuthor}`;
    replyingTo.hidden = false;
    replyTitle.focus();

  });
});

if (clearDraftButton) {
  clearDraftButton.addEventListener("click", () => {
    setDraft(originalDraft);
    if (replyingTo) replyingTo.hidden = true;
    formMessage.textContent = "Form reset.";
  });
}

replyForm.addEventListener("submit", (event) => {
  const isValid = [validateReplyTitle(), validateReplyMessage(), validateReplyImage()].every(Boolean);
  if (!isValid) {
    event.preventDefault();
    formMessage.textContent = "Please correct the form errors.";
    return;
  }
});
