const statusToggles = document.querySelectorAll(".status-toggle");
const userListMessage = document.querySelector("#user-list-message");

function updateStatusLabel(row, enabled) {
  const status = row.querySelector(".status");
  status.textContent = enabled ? "Enabled" : "Disabled";
  status.classList.toggle("enabled", enabled);
  status.classList.toggle("disabled", !enabled);
}

statusToggles.forEach((toggle) => {
  toggle.addEventListener("change", async () => {
    const row = toggle.closest("tr");
    const oldValue = !toggle.checked;
    toggle.disabled = true;
    userListMessage.textContent = "Saving account status...";
    userListMessage.className = "user-list-message";

    try {
      const response = await fetch(`/admin-users/${row.dataset.userId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toggle.checked ? "active" : "locked" }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      updateStatusLabel(row, toggle.checked);
      userListMessage.textContent = result.message;
      userListMessage.classList.add("success-message");
    } catch (error) {
      toggle.checked = oldValue;
      updateStatusLabel(row, oldValue);
      userListMessage.textContent = error.message || "Could not update the account status.";
      userListMessage.classList.add("error-message");
    } finally {
      toggle.disabled = false;
    }
  });
});
