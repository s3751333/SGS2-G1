const registerForm = document.querySelector("#register-form");
const formMessage = document.querySelector("#form-message");
const fullName = document.querySelector("#fullname");
const fullNameMessage = document.querySelector("#fullname-message");
const username = document.querySelector("#username");
const usernameMessage = document.querySelector("#username-message");
const email = document.querySelector("#email");
const emailMessage = document.querySelector("#email-message");
const introduction = document.querySelector("#introduction");
const introductionCount = document.querySelector("#introduction-count");
const password = document.querySelector("#password");
const passwordMessage = document.querySelector("#password-message");
const confirmPassword = document.querySelector("#confirm-password");
const confirmPasswordMessage = document.querySelector("#confirm-password-message");
const securityAnswerFields = [1, 2, 3].map(function (number) {
  return {
    input: document.querySelector(`#security-answer-${number}`),
    message: document.querySelector(`#security-answer-${number}-message`),
  };
});
const storageKey = "booknookRegistrationForm";

function saveFormData() {
  const formData = {
    fullName: fullName.value,
    username: username.value,
    email: email.value,
    introduction: introduction.value,
  };

  localStorage.setItem(storageKey, JSON.stringify(formData));
}

function loadFormData() {
  const savedFormData = localStorage.getItem(storageKey);

  if (savedFormData) {
    try {
      const formData = JSON.parse(savedFormData);
      fullName.value = formData.fullName || "";
      username.value = formData.username || "";
      email.value = formData.email || "";
      introduction.value = formData.introduction || "";
      introductionCount.textContent = `${introduction.value.length} / 300 characters`;
    } catch {
      localStorage.removeItem(storageKey);
    }
  }
}

function showMessage(element, message, isValid) {
  element.textContent = message;
  element.style.color = isValid ? "green" : "red";
}

function validateFullName() {
  const isValid = fullName.value.trim().length >= 2;
  showMessage(fullNameMessage, isValid ? "Full name is valid." : "Enter at least 2 characters.", isValid);
  return isValid;
}

function validateUsername() {
  const usernamePattern = /^[A-Za-z0-9_]{3,24}$/;
  const isValid = usernamePattern.test(username.value);
  showMessage(usernameMessage, isValid ? "Username is valid." : "Use 3-24 letters, numbers, or underscores.", isValid);
  return isValid;
}

function validateEmail() {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailPattern.test(email.value);
  showMessage(emailMessage, isValid ? "Email is valid." : "Enter a valid email address.", isValid);
  return isValid;
}

function validatePassword() {
  const isValid = password.value.length >= 8 && /[A-Z]/.test(password.value) && /[0-9]/.test(password.value);
  showMessage(passwordMessage, isValid ? "Password is valid." : "Use 8 characters, a capital letter, and a number.", isValid);
  return isValid;
}

function showPasswordMatch() {
  const isValid = confirmPassword.value !== "" && password.value === confirmPassword.value;
  showMessage(confirmPasswordMessage, isValid ? "Passwords match." : "Passwords do not match.", isValid);
  return isValid;
}

function validateSecurityAnswer(field) {
  const answerLength = field.input.value.trim().length;
  const isValid = answerLength >= 2 && answerLength <= 80;
  showMessage(field.message, isValid ? "Answer is valid." : "Enter between 2 and 80 characters.", isValid);
  return isValid;
}

loadFormData();

[fullName, username, email, introduction].forEach(function (field) {
  field.addEventListener("input", saveFormData);
});

fullName.addEventListener("input", validateFullName);
username.addEventListener("input", validateUsername);
email.addEventListener("input", validateEmail);
introduction.addEventListener("input", function () {
  introductionCount.textContent = `${introduction.value.length} / 300 characters`;
});
password.addEventListener("input", function () {
  validatePassword();
  if (confirmPassword.value !== "") {
    showPasswordMatch();
  }
});
confirmPassword.addEventListener("input", showPasswordMatch);
securityAnswerFields.forEach(function (field) {
  field.input.addEventListener("input", function () {
    validateSecurityAnswer(field);
  });
});

registerForm.addEventListener("submit", async function (event) {
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

  const validFields = [
    validateFullName(),
    validateUsername(),
    validateEmail(),
    ...securityAnswerFields.map(validateSecurityAnswer),
    validatePassword(),
    showPasswordMatch(),
  ];

  if (validFields.includes(false)) {
    formMessage.textContent = "Please correct the form errors.";
    return;
  }

  const registrationData = {
    fullName: fullName.value,
    username: username.value,
    email: email.value,
    introduction: introduction.value,
    securityAnswer1: securityAnswerFields[0].input.value,
    securityAnswer2: securityAnswerFields[1].input.value,
    securityAnswer3: securityAnswerFields[2].input.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
  };

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registrationData),
    });

    const result = await response.json();
    formMessage.textContent = result.message;
    formMessage.style.color = response.ok ? "green" : "red";

    if (response.ok) {
      localStorage.removeItem(storageKey);
      registerForm.reset();
      introductionCount.textContent = "0 / 300 characters";

      [
        fullNameMessage,
        usernameMessage,
        emailMessage,
        ...securityAnswerFields.map(function (field) {
          return field.message;
        }),
        passwordMessage,
        confirmPasswordMessage,
      ].forEach(function (message) {
        message.textContent = "";
      });

      setTimeout(function () {
        window.location.href = "/login";
      }, 700);
    }
  } catch {
    formMessage.textContent = "Could not connect to the server.";
    formMessage.style.color = "red";
  }
});
