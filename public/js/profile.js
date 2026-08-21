(function () {
  "use strict";

  // --- Logout button on the profile page itself (distinct id from the navbar's) ---
  const profileLogoutButton = document.querySelector("#profile-logout-button");

  if (profileLogoutButton) {
    profileLogoutButton.addEventListener("click", async () => {
      profileLogoutButton.disabled = true;
      try {
        await fetch("/logout", { method: "POST" });
        window.location.href = "/login";
      } catch {
        profileLogoutButton.disabled = false;
      }
    });
  }

  // --- Confirm before deactivating the account ---
  document.querySelectorAll("[data-confirm-submit]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      if (!window.confirm(form.dataset.confirmSubmit)) {
        event.preventDefault();
      }
    });
  });

  // --- Live validation: personal information form ---
  const profileForm = document.querySelector("#profile-form");

  if (profileForm) {
    const fullNameInput = profileForm.querySelector("#full-name");
    const emailInput = profileForm.querySelector("#email");
    const introductionInput = profileForm.querySelector("#introduction");
    const submitButton = profileForm.querySelector("button[type='submit']");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function showError(fieldName, message) {
      const target = profileForm.querySelector(`[data-error-for="${fieldName}"]`);
      if (target) target.textContent = message;
    }

    function validateProfileForm() {
      let isValid = true;

      const nameLength = fullNameInput.value.trim().length;
      if (nameLength < 2 || nameLength > 80) {
        showError("fullName", "Full name must be between 2 and 80 characters.");
        isValid = false;
      } else {
        showError("fullName", "");
      }

      if (!emailPattern.test(emailInput.value.trim())) {
        showError("email", "Please enter a valid email address.");
        isValid = false;
      } else {
        showError("email", "");
      }

      if (introductionInput.value.length > 300) {
        showError("introduction", "Introduction must be 300 characters or fewer.");
        isValid = false;
      } else {
        showError("introduction", "");
      }

      submitButton.disabled = !isValid;
      return isValid;
    }

    [fullNameInput, emailInput, introductionInput].forEach((field) => {
      field.addEventListener("input", validateProfileForm);
    });

    profileForm.addEventListener("submit", (event) => {
      if (!validateProfileForm()) event.preventDefault();
    });

    validateProfileForm();
  }

  // --- Live validation: change password form ---
  const passwordForm = document.querySelector("#password-form");

  if (passwordForm) {
    const currentPasswordInput = passwordForm.querySelector("#current-password");
    const newPasswordInput = passwordForm.querySelector("#new-password");
    const confirmPasswordInput = passwordForm.querySelector("#confirm-password");
    const submitButton = passwordForm.querySelector("button[type='submit']");

    function showError(fieldName, message) {
      const target = passwordForm.querySelector(`[data-error-for="${fieldName}"]`);
      if (target) target.textContent = message;
    }

    function validatePasswordForm() {
      let isValid = true;

      if (currentPasswordInput.value.length === 0) {
        showError("currentPassword", "Enter your current password.");
        isValid = false;
      } else {
        showError("currentPassword", "");
      }

      if (newPasswordInput.value.length < 8) {
        showError("newPassword", "New password must be at least 8 characters.");
        isValid = false;
      } else {
        showError("newPassword", "");
      }

      if (confirmPasswordInput.value !== newPasswordInput.value || confirmPasswordInput.value.length === 0) {
        showError("confirmPassword", "Passwords do not match.");
        isValid = false;
      } else {
        showError("confirmPassword", "");
      }

      submitButton.disabled = !isValid;
      return isValid;
    }

    [currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach((field) => {
      field.addEventListener("input", validatePasswordForm);
    });

    passwordForm.addEventListener("submit", (event) => {
      if (!validatePasswordForm()) event.preventDefault();
    });
  }
})();
