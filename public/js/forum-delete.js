document.querySelectorAll(".delete-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    if (!window.confirm("Delete this post from public view?")) {
      event.preventDefault();
    }
  });
});
