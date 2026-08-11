const loginForm = document.querySelector("#login-form");
const email = document.querySelector("#login-email");
const password = document.querySelector("#login-password");
const loginMessage = document.querySelector("#login-message");

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email.value) || password.value === "") {
    loginMessage.textContent = "Enter a valid email and password.";
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
        email: email.value,
        password: password.value,
      }),
    });

    const result = await response.json();
    loginMessage.textContent = result.message;
    loginMessage.style.color = response.ok ? "green" : "red";

    if (response.ok) {
      setTimeout(function () {
        window.location.href = "blogs.html";
      }, 700);
    }
  } catch {
    loginMessage.textContent = "Could not connect to the server.";
    loginMessage.style.color = "red";
  }
});
