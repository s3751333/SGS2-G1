(function () {
const body = document.body;
const navbar = document.querySelector(".navbar");
const menuBtn = document.querySelector(".menu-btn");
const cancelBtn = document.querySelector(".cancel-btn button");
const logoutButton = document.querySelector("#logout-button");
const cartButton = document.querySelector(".cart-btn");
const cartCount = document.querySelector("[data-cart-count]");

function openMenu() {
    navbar.classList.add("show");
    menuBtn.classList.add("hide");
    menuBtn.setAttribute("aria-expanded", "true");
    body.classList.add("disabled");
    cancelBtn.focus();
}

function closeMenu() {
    body.classList.remove("disabled");
    navbar.classList.remove("show");
    menuBtn.classList.remove("hide");
    menuBtn.setAttribute("aria-expanded", "false");
}

function updateCartCount() {
    if (!cartCount) return;
    let count = 0;
    if (window.BookNookStore) {
        count = window.BookNookStore.getItemCount();
    } else {
        try {
            const cart = JSON.parse(localStorage.getItem("booknook-cart-v1")) || [];
            count = Array.isArray(cart)
                ? cart.reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0), 0)
                : 0;
        } catch {
            count = 0;
        }
    }
    cartCount.textContent = count > 99 ? "99+" : count;
    cartCount.hidden = count === 0;
    cartButton.setAttribute("aria-label", `Shopping cart, ${count} item${count === 1 ? "" : "s"}`);
}

menuBtn?.addEventListener("click", openMenu);
cancelBtn?.addEventListener("click", closeMenu);
document.querySelectorAll("#main-menu a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navbar?.classList.contains("show")) closeMenu();
});

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

window.addEventListener("booknook:cart-changed", updateCartCount);
window.addEventListener("storage", updateCartCount);
updateCartCount();
})();
