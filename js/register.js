const registerForm = document.querySelector("#register-form");
const formMessage = document.querySelector("#form-message");

registerForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const requiredFields = registerForm.querySelectorAll("[required]");
  let allFieldsComplete = true;

  requiredFields.forEach(function (field) {
    if (field.value.trim() === "") {
      allFieldsComplete = false;
    }
  });

  if (allFieldsComplete) {
    formMessage.textContent = "All required fields are complete.";
  } else {
    formMessage.textContent = "Please complete all required fields.";
  }
});
