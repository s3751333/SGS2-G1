const commentForm = document.querySelector("#comment-form");

if (commentForm) {
  const commentInput = document.querySelector("#comment-text");
  const commentError = document.querySelector("#comment-error");
  const submitButton = commentForm.querySelector("button[type='submit']");
  const draftStorageKey = `booknookCommentDraft:${commentForm.dataset.postId}`;

  function validateComment() {
    const commentLength = commentInput.value.trim().length;

    if (commentLength === 0) {
      commentError.textContent = "Please enter a comment.";
      submitButton.disabled = true;
      return false;
    }

    if (commentLength < 3) {
      commentError.textContent = "The comment must contain at least 3 characters.";
      submitButton.disabled = true;
      return false;
    }

    commentError.textContent = "";
    submitButton.disabled = false;
    return true;
  }

  const savedDraft = localStorage.getItem(draftStorageKey);

  if (savedDraft && !commentInput.value) {
    commentInput.value = savedDraft;
  }

  commentInput.addEventListener("input", function () {
    localStorage.setItem(draftStorageKey, commentInput.value);
    validateComment();
  });

  commentForm.addEventListener("submit", function (event) {
    if (!validateComment()) {
      event.preventDefault();
      return;
    }

    localStorage.removeItem(draftStorageKey);
  });

  validateComment();
}
