const body = document.querySelector("body");
const navbar = document.querySelector(".navbar");
const menuBtn = document.querySelector(".menu-btn");
const cancelBtn = document.querySelector(".cancel-btn");
const loginLink = document.querySelector('.navbar a[href="login.html"]');

menuBtn.onclick = () => {
    navbar.classList.add("show");
    menuBtn.classList.add("hide");
    body.classList.add("disabled");
}

cancelBtn.onclick = () => {
    body.classList.remove("disabled");
    navbar.classList.remove("show");
    menuBtn.classList.remove("hide");
}

async function updateLoginLink() {
    if (!loginLink) {
        return;
    }

    try {
        const response = await fetch("/session");
        const result = await response.json();

        if (result.user) {
            loginLink.textContent = `Logout (${result.user.username})`;
            loginLink.href = "#";

            loginLink.addEventListener("click", async function (event) {
                event.preventDefault();
                await fetch("/logout", { method: "POST" });
                window.location.href = "login.html";
            });
        }
    } catch {
        console.log("Could not check the current session.");
    }
}

updateLoginLink();
