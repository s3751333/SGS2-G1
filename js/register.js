const registerForm = document.querySelector("#register-form");
const formMessage = document.querySelector("#form-message");
const username = document.querySelector("#username");
const usernameMessage = document.querySelector("#username-message");
const password = document.querySelector("#password");
const confirmPassword = document.querySelector("#confirm-password");

username.addEventListener("input", function () {
  const usernamePattern = /^[A-Za-z0-9_]{3,24}$/;

  if (username.value === "") {
    usernameMessage.textContent = "";
  } else if (usernamePattern.test(username.value)) {
    usernameMessage.textContent = "Username is valid.";
  } else {
    usernameMessage.textContent = "Use 3-24 letters, numbers, or underscores.";
  }
});

function showPasswordMatch() {
  if (password.value === "" || confirmPassword.value === "") {
    formMessage.textContent = "";
  } else if (password.value === confirmPassword.value) {
    formMessage.textContent = "Passwords match.";
  } else {
    formMessage.textContent = "Passwords do not match.";
  }
}

password.addEventListener("input", showPasswordMatch);
confirmPassword.addEventListener("input", showPasswordMatch);

registerForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const requiredFields = registerForm.querySelectorAll("[required]");
  let allFieldsComplete = true;

  requiredFields.forEach(function (field) {
    if (field.value.trim() === "") {
      allFieldsComplete = false;
    }
  });

  if (!allFieldsComplete) {
    formMessage.textContent = "Please complete all required fields.";
    return;
  }

  if (password.value !== confirmPassword.value) {
    formMessage.textContent = "Passwords do not match.";
    return;
  }

  formMessage.textContent = "The registration form is valid.";
});
