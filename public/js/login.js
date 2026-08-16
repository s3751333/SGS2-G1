const loginForm = document.querySelector("#login-form");
const email = document.querySelector("#login-email");
const password = document.querySelector("#login-password");
const emailMessage = document.querySelector("#login-email-message");
const passwordMessage = document.querySelector("#login-password-message");
const loginMessage = document.querySelector("#login-message");
const rememberEmail = document.querySelector("#remember-email");
const emailStorageKey = "booknookLoginEmail";

function showFieldMessage(input, messageElement, message) {
  messageElement.textContent = message;
  messageElement.style.color = message ? "red" : "";
  input.classList.toggle("input-error", message !== "");
  return message === "";
}

function validateEmail() {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const message = emailPattern.test(email.value.trim()) ? "" : "Enter a valid email address.";
  return showFieldMessage(email, emailMessage, message);
}

function validatePassword() {
  const message = password.value ? "" : "Enter your password.";
  return showFieldMessage(password, passwordMessage, message);
}

const savedEmail = localStorage.getItem(emailStorageKey);

if (savedEmail) {
  email.value = savedEmail;
  rememberEmail.checked = true;
}

email.addEventListener("input", validateEmail);
password.addEventListener("input", validatePassword);

rememberEmail.addEventListener("change", function () {
  if (!rememberEmail.checked) {
    localStorage.removeItem(emailStorageKey);
  }
});

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!validateEmail() || !validatePassword()) {
    loginMessage.textContent = "Please correct the form errors.";
    loginMessage.style.color = "red";
    return;
  }

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value,
        next: loginForm.dataset.next,
      }),
    });

    const result = await response.json();
    loginMessage.textContent = result.message;
    loginMessage.style.color = response.ok ? "green" : "red";

    if (response.ok) {
      if (rememberEmail.checked) {
        localStorage.setItem(emailStorageKey, email.value.trim());
      } else {
        localStorage.removeItem(emailStorageKey);
      }

      window.location.href = result.redirectTo;
    }
  } catch {
    loginMessage.textContent = "Could not connect to the server.";
    loginMessage.style.color = "red";
  }
});
