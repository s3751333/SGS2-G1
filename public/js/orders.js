(function () {
  "use strict";

  const ordersList = document.querySelector("#orders-list");
  const emptyState = document.querySelector("#orders-empty");
  const message = document.querySelector("#orders-message");
  const pendingOrders = new WeakSet();

  async function requestOrder(orderId, options) {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      ...options,
      headers: { "Content-Type": "application/json" },
    });
    if (response.status === 401) {
      window.location.href = "/login?next=%2Forders";
      throw new Error("Please sign in to manage your orders.");
    }
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || "The order could not be updated. Please try again.");
      error.errors = data.errors || {};
      throw error;
    }
    return data;
  }

  async function changeOrder(card, action, form) {
    if (pendingOrders.has(card)) return;
    pendingOrders.add(card);
    const buttons = [...card.querySelectorAll("button")];
    buttons.forEach((button) => { button.disabled = true; });
    message.textContent = "";
    card.setAttribute("aria-busy", "true");
    try {
      await action();
    } catch (error) {
      message.textContent = error.message;
      if (form) {
        Object.entries(error.errors || {}).forEach(([name, text]) => {
          form.elements.namedItem(name)?.setCustomValidity?.(text);
        });
        form.reportValidity();
      }
    } finally {
      pendingOrders.delete(card);
      buttons.forEach((button) => { button.disabled = false; });
      card.removeAttribute("aria-busy");
    }
  }

  ordersList.addEventListener("click", (event) => {
    const button = event.target.closest(".cancel-order");
    if (!button) return;
    const card = button.closest("[data-order-id]");
    changeOrder(card, async () => {
      await requestOrder(card.dataset.orderId, { method: "DELETE" });
      card.remove();
      emptyState.hidden = Boolean(ordersList.querySelector("[data-order-id]"));
      message.textContent = "Order cancelled successfully.";
    });
  });

  ordersList.addEventListener("submit", (event) => {
    const form = event.target.closest(".order-edit-form");
    if (!form) return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    const card = form.closest("[data-order-id]");
    const { payment, ...customer } = Object.fromEntries(new FormData(form));
    changeOrder(card, async () => {
      await requestOrder(card.dataset.orderId, {
        method: "PATCH",
        body: JSON.stringify({ customer, payment }),
      });
      window.location.reload();
    }, form);
  });

  ordersList.addEventListener("input", (event) => {
    event.target.setCustomValidity?.("");
  });
})();
