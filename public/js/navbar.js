const body = document.querySelector("body");
const navbar = document.querySelector(".navbar");
const menuBtn = document.querySelector(".menu-btn");
const cancelBtn = document.querySelector(".cancel-btn");
const logoutButton = document.querySelector("#logout-button");

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

async function logout() {
    logoutButton.disabled = true;

    try {
        await fetch("/logout", { method: "POST" });
        window.location.href = "/login";
    } catch {
        logoutButton.disabled = false;
    }
}

if (logoutButton) {
    logoutButton.addEventListener("click", logout);
}
