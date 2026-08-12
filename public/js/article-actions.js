const deletePostForm = document.querySelector(".delete-post-form");

if (deletePostForm) {
  deletePostForm.addEventListener("submit", function (event) {
    const confirmed = window.confirm("Are you sure you want to delete this blog post?");

    if (!confirmed) {
      event.preventDefault();
    }
  });
}
