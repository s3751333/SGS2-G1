const statusToggles = document.querySelectorAll(".status-toggle");

statusToggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
        const status = toggle.closest("tr").querySelector(".status");

        status.textContent = toggle.checked ? "Enabled" : "Disabled";
        status.classList.toggle("enabled", toggle.checked);
        status.classList.toggle("disabled", !toggle.checked);
    });
});
