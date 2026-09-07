(function () {
  "use strict";

  const store = window.BookNookStore;
  const container = document.querySelector("#home-featured-products");
  if (!container) return;

  container.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-home-add]");
    if (!button) return;
    button.disabled = true;
    try {
      const result = await store.addItem(button.dataset.homeAdd, 1);
      if (!result) return;
    } catch (error) {
      window.alert(error.message);
      button.disabled = false;
      return;
    }
    button.textContent = "Added";
    window.setTimeout(() => {
      button.textContent = "Add to Cart";
      button.disabled = false;
    }, 1200);
  });
})();
