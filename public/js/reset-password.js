const resetPasswordForm = document.querySelector("#reset-password-form");
const newPassword = document.querySelector("#new-password");
const confirmNewPassword = document.querySelector("#confirm-new-password");
const newPasswordError = document.querySelector("#new-password-error");
const confirmNewPasswordError = document.querySelector("#confirm-new-password-error");
const resetPasswordMessage = document.querySelector("#reset-password-message");

function validateNewPassword() {
  const value = newPassword.value;
  const isValid = value.length >= 8 && value.length <= 72 && /[A-Z]/.test(value) && /[0-9]/.test(value);

  newPasswordError.textContent = isValid ? "" : "Use 8 characters, a capital letter, and a number.";
  newPasswordError.style.color = isValid ? "" : "red";
  newPassword.classList.toggle("input-error", !isValid);
  return isValid;
}

function validatePasswordMatch() {
  const isValid = confirmNewPassword.value !== "" && confirmNewPassword.value === newPassword.value;

  confirmNewPasswordError.textContent = isValid ? "" : "The passwords do not match.";
  confirmNewPasswordError.style.color = isValid ? "" : "red";
  confirmNewPassword.classList.toggle("input-error", !isValid);
  return isValid;
}

newPassword.addEventListener("input", function () {
  validateNewPassword();
  if (confirmNewPassword.value) {
    validatePasswordMatch();
  }
});
confirmNewPassword.addEventListener("input", validatePasswordMatch);

resetPasswordForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!validateNewPassword() || !validatePasswordMatch()) {
    resetPasswordMessage.textContent = "Please correct the form errors.";
    resetPasswordMessage.style.color = "red";
    return;
  }

  try {
    const response = await fetch("/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetPasswordForm.dataset.token,
        password: newPassword.value,
        confirmPassword: confirmNewPassword.value,
      }),
    });
    const result = await response.json();

    resetPasswordMessage.textContent = result.message;
    resetPasswordMessage.style.color = response.ok ? "green" : "red";

    if (response.ok) {
      setTimeout(function () {
        window.location.href = result.redirectTo;
      }, 700);
    }
  } catch {
    resetPasswordMessage.textContent = "Could not connect to the server.";
    resetPasswordMessage.style.color = "red";
  }
});
