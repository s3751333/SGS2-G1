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

function renderCartCount(count) {
    if (!cartCount) return;
    cartCount.textContent = count > 99 ? "99+" : count;
    cartCount.hidden = count === 0;
    cartButton.setAttribute("aria-label", `Shopping cart, ${count} item${count === 1 ? "" : "s"}`);
}

async function updateCartCount(event) {
    if (!cartCount) return;
    if (event?.detail && Number.isInteger(event.detail.itemCount)) {
        renderCartCount(event.detail.itemCount);
        return;
    }
    try {
        if (window.BookNookStore) {
            await window.BookNookStore.ready;
            renderCartCount(window.BookNookStore.getItemCount());
            return;
        }
        const response = await fetch("/api/cart");
        if (!response.ok) return renderCartCount(0);
        const cart = await response.json();
        renderCartCount(cart.itemCount);
    } catch {
        renderCartCount(0);
    }
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
updateCartCount();
})();
