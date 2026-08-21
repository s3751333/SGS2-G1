(function () {
  "use strict";

  const store = window.BookNookStore;
  const container = document.querySelector("#home-featured-products");
  if (!container) return;

  ["little-prince", "catan", "english-grammar"].forEach((productId) => {
    const product = store.getProduct(productId);
    const card = document.createElement("article");
    card.className = "featured-product";
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <div>
        <span>${product.category === "board-games" ? "Board game" : "Book"}</span>
        <h3>${product.name}</h3>
        <p>${store.formatCurrency(product.price)}</p>
        <button type="button" data-home-add="${product.id}">Add to Cart</button>
      </div>`;
    container.append(card);
  });

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
