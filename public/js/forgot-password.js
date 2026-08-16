const forgotPasswordForm = document.querySelector("#forgot-password-form");
const resetEmail = document.querySelector("#reset-email");
const resetEmailError = document.querySelector("#reset-email-error");
const resetRequestMessage = document.querySelector("#reset-request-message");
const resetLinkContainer = document.querySelector("#reset-link-container");

function validateResetEmail() {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailPattern.test(resetEmail.value.trim());

  resetEmailError.textContent = isValid ? "" : "Enter a valid email address.";
  resetEmailError.style.color = isValid ? "" : "red";
  resetEmail.classList.toggle("input-error", !isValid);
  return isValid;
}

resetEmail.addEventListener("input", validateResetEmail);

forgotPasswordForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  resetLinkContainer.innerHTML = "";

  if (!validateResetEmail()) {
    resetRequestMessage.textContent = "Please correct the email address.";
    resetRequestMessage.style.color = "red";
    return;
  }

  try {
    const response = await fetch("/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resetEmail.value.trim() }),
    });
    const result = await response.json();

    resetRequestMessage.textContent = result.message;
    resetRequestMessage.style.color = response.ok ? "green" : "red";

    if (response.ok) {
      resetLinkContainer.innerHTML = `
        <p class="prototype-notice">
          Prototype reset link: <a class="prototype-reset-link" href="${result.resetUrl}">Continue to password reset</a>
        </p>
      `;
    }
  } catch {
    resetRequestMessage.textContent = "Could not connect to the server.";
    resetRequestMessage.style.color = "red";
  }
});
