const forgotPasswordForm = document.querySelector("#forgot-password-form");
const resetEmail = document.querySelector("#reset-email");
const resetEmailError = document.querySelector("#reset-email-error");
const resetRequestMessage = document.querySelector("#reset-request-message");
const resetAnswerFields = [1, 2, 3].map(function (number) {
  return {
    input: document.querySelector(`#reset-answer-${number}`),
    error: document.querySelector(`#reset-answer-${number}-error`),
  };
});

function validateResetEmail() {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailPattern.test(resetEmail.value.trim());

  resetEmailError.textContent = isValid ? "" : "Enter a valid email address.";
  resetEmailError.style.color = isValid ? "" : "red";
  resetEmail.classList.toggle("input-error", !isValid);
  return isValid;
}

function validateSecurityAnswer(field) {
  const answerLength = field.input.value.trim().length;
  const isValid = answerLength >= 2 && answerLength <= 80;

  field.error.textContent = isValid ? "" : "Enter between 2 and 80 characters.";
  field.error.style.color = isValid ? "" : "red";
  field.input.classList.toggle("input-error", !isValid);
  return isValid;
}

resetEmail.addEventListener("input", validateResetEmail);
resetAnswerFields.forEach(function (field) {
  field.input.addEventListener("input", function () {
    validateSecurityAnswer(field);
  });
});

forgotPasswordForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const answersAreValid = resetAnswerFields.map(validateSecurityAnswer).every(Boolean);

  if (!validateResetEmail() || !answersAreValid) {
    resetRequestMessage.textContent = "Please complete the email and all three answers.";
    resetRequestMessage.style.color = "red";
    return;
  }

  try {
    const response = await fetch("/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: resetEmail.value.trim(),
        securityAnswer1: resetAnswerFields[0].input.value,
        securityAnswer2: resetAnswerFields[1].input.value,
        securityAnswer3: resetAnswerFields[2].input.value,
      }),
    });
    const result = await response.json();

    resetRequestMessage.textContent = result.message;
    resetRequestMessage.style.color = response.ok ? "green" : "red";

    if (response.ok) {
      setTimeout(function () {
        window.location.href = result.redirectTo;
      }, 600);
    }
  } catch {
    resetRequestMessage.textContent = "Could not connect to the server.";
    resetRequestMessage.style.color = "red";
  }
});
