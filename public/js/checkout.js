(function () {
  "use strict";

  const store = window.BookNookStore;
  const form = document.querySelector("#checkout-form");
  const layout = document.querySelector("#checkout-content");
  const productsContainer = document.querySelector("#checkout-products");
  const emptyState = document.querySelector("#checkout-empty");
  const subtotalElement = document.querySelector("#checkout-subtotal");
  const totalElement = document.querySelector("#checkout-total");
  const submitButton = document.querySelector("#place-order-button");
  const bankDetails = document.querySelector("#bank-details");
  const confirmation = document.querySelector("#order-confirmation");

  function renderOrder() {
    const items = store.getCartDetails();
    productsContainer.replaceChildren();

    items.forEach(({ product, quantity, lineTotal }) => {
      const row = document.createElement("div");
      row.className = "checkout-product";
      row.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <span>${product.name}<small>Quantity: ${quantity}</small></span>
        <strong>${store.formatCurrency(lineTotal)}</strong>`;
      productsContainer.append(row);
    });

    const subtotal = store.getSubtotal();
    subtotalElement.textContent = store.formatCurrency(subtotal);
    totalElement.textContent = store.formatCurrency(subtotal);
    layout.hidden = items.length === 0;
    emptyState.hidden = items.length > 0;
    submitButton.disabled = items.length === 0;
  }

  form.addEventListener("change", (event) => {
    if (event.target.name === "payment") {
      bankDetails.hidden = event.target.value !== "bank";
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity() || !store.getItemCount()) return;

    const values = new FormData(form);
    const customer = {
      fullName: values.get("fullName").trim(),
      email: values.get("email").trim(),
      phone: values.get("phone").trim(),
      address: values.get("address").trim(),
      city: values.get("city").trim(),
      district: values.get("district").trim(),
      note: values.get("note").trim(),
    };
    const order = store.createOrder(customer, values.get("payment"));
    if (!order) return;

    layout.hidden = true;
    emptyState.hidden = true;
    confirmation.hidden = false;
    confirmation.querySelector("[data-order-id]").textContent = order.id;
    confirmation.querySelector("[data-order-total]").textContent = store.formatCurrency(order.subtotal);
    confirmation.querySelector("[data-order-email]").textContent = order.customer.email;
    confirmation.querySelector("[data-bank-message]").hidden = order.payment !== "bank";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  renderOrder();
})();
