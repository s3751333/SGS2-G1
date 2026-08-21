(function () {
  "use strict";

  const store = window.BookNookStore;

  // --- Quantity selector + add to cart (unchanged from A1 behaviour) ---
  const quantityValue = document.querySelector("[data-product-quantity]");
  const decreaseButton = document.querySelector("[data-quantity-decrease]");
  const increaseButton = document.querySelector("[data-quantity-increase]");
  const addButton = document.querySelector("[data-add-to-cart]");

  if (quantityValue && addButton && store) {
    let quantity = 1;

    function renderQuantity() {
      quantityValue.textContent = quantity;
      decreaseButton.disabled = quantity === 1;
    }

    decreaseButton.addEventListener("click", () => {
      quantity = Math.max(1, quantity - 1);
      renderQuantity();
    });

    increaseButton.addEventListener("click", () => {
      quantity = Math.min(99, quantity + 1);
      renderQuantity();
    });

    addButton.addEventListener("click", async (event) => {
      event.preventDefault();
      addButton.setAttribute("aria-disabled", "true");
      try {
        const result = await store.addItem(addButton.dataset.addToCart, quantity);
        if (!result) return;
      } catch (error) {
        window.alert(error.message);
        addButton.removeAttribute("aria-disabled");
        return;
      }
      addButton.innerHTML = '<i class="fas fa-check"></i> Added to Cart';
      window.setTimeout(() => {
        addButton.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
        addButton.removeAttribute("aria-disabled");
      }, 1400);
    });

    renderQuantity();
  }

  // --- Wishlist toggle (add/remove) without a page reload ---
  const wishlistButton = document.querySelector("[data-wishlist-toggle]");

  if (wishlistButton) {
    wishlistButton.addEventListener("click", async () => {
      const productId = wishlistButton.dataset.productId;
      const isSaved = wishlistButton.dataset.saved === "true";
      const label = wishlistButton.querySelector("[data-wishlist-label]");
      const icon = wishlistButton.querySelector("i");

      wishlistButton.disabled = true;

      try {
        const response = isSaved
          ? await fetch(`/wishlist/${encodeURIComponent(productId)}`, { method: "DELETE" })
          : await fetch("/wishlist", {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({ productId }),
            });

        if (!response.ok) throw new Error("Request failed");

        const nowSaved = !isSaved;
        wishlistButton.dataset.saved = String(nowSaved);
        wishlistButton.classList.toggle("is-saved", nowSaved);
        icon.classList.toggle("fas", nowSaved);
        icon.classList.toggle("far", !nowSaved);
        label.textContent = nowSaved ? "Saved to Wishlist" : "Add to Wishlist";
      } catch {
        window.alert("Something went wrong updating your wishlist. Please try again.");
      } finally {
        wishlistButton.disabled = false;
      }
    });
  }

  // --- Helpful button (live count, no reload) ---
  document.querySelectorAll("[data-helpful-button]").forEach((button) => {
    button.addEventListener("click", async () => {
      const { productId, reviewId } = button.dataset;
      button.disabled = true;

      try {
        const response = await fetch(`/product-detail/${productId}/reviews/${reviewId}/helpful`, {
          method: "POST",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) throw new Error("Request failed");

        const data = await response.json();
        button.querySelector("[data-helpful-count]").textContent = data.helpfulCount;
      } catch {
        // Silently ignore; the count simply won't update this click.
      } finally {
        button.disabled = false;
      }
    });
  });

  // --- Confirm before deleting a review ---
  document.querySelectorAll("[data-confirm-delete]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      if (!window.confirm(form.dataset.confirmDelete)) {
        event.preventDefault();
      }
    });
  });

  // --- Review sort dropdown ---
  const sortSelect = document.querySelector("[data-review-sort]");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      const url = new URL(window.location.href);
      url.searchParams.set("sort", sortSelect.value);
      url.hash = "reviews";
      window.location.href = url.toString();
    });
  }

  // --- Live review-form validation ---
  const reviewForm = document.querySelector("#review-form");

  if (reviewForm) {
    const titleInput = reviewForm.querySelector("#review-title");
    const bodyInput = reviewForm.querySelector("#review-body");
    const ratingInputs = [...reviewForm.querySelectorAll("input[name='rating']")];
    const submitButton = reviewForm.querySelector("button[type='submit']");

    function showError(fieldName, message) {
      const target = reviewForm.querySelector(`[data-error-for="${fieldName}"]`);
      if (target) target.textContent = message;
    }

    function validateReviewForm() {
      let isValid = true;

      if (!ratingInputs.some((input) => input.checked)) {
        showError("rating", "Please select a star rating.");
        isValid = false;
      } else {
        showError("rating", "");
      }

      const titleLength = titleInput.value.trim().length;
      if (titleLength < 3 || titleLength > 120) {
        showError("title", "Title must be between 3 and 120 characters.");
        isValid = false;
      } else {
        showError("title", "");
      }

      const bodyLength = bodyInput.value.trim().length;
      if (bodyLength < 10 || bodyLength > 1000) {
        showError("body", "Review must be between 10 and 1000 characters.");
        isValid = false;
      } else {
        showError("body", "");
      }

      submitButton.disabled = !isValid;
      return isValid;
    }

    titleInput.addEventListener("input", validateReviewForm);
    bodyInput.addEventListener("input", validateReviewForm);
    ratingInputs.forEach((input) => input.addEventListener("change", validateReviewForm));

    reviewForm.addEventListener("submit", (event) => {
      if (!validateReviewForm()) {
        event.preventDefault();
      }
    });

    validateReviewForm();
  }
})();
