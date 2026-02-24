document.addEventListener("DOMContentLoaded", async () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userMenuToggle = document.getElementById("user-menu-toggle");
  const adminPanel = document.getElementById("admin-panel");
  const adminStatusText = document.getElementById("admin-status-text");
  const adminLoginBtn = document.getElementById("admin-login-btn");
  const adminLogoutBtn = document.getElementById("admin-logout-btn");
  const loginModal = document.getElementById("login-modal");
  const adminLoginForm = document.getElementById("admin-login-form");
  const loginCancelBtn = document.getElementById("login-cancel-btn");
  const adminPasswordInput = document.getElementById("admin-password");

  let isAdmin = false;

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function renderAdminControls() {
    adminStatusText.textContent = isAdmin ? "Admin Mode" : "Student Mode";
    adminLoginBtn.classList.toggle("hidden", isAdmin);
    adminLogoutBtn.classList.toggle("hidden", !isAdmin);
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
    adminPasswordInput.focus();
  }

  function closeLoginModal() {
    adminLoginForm.reset();
    loginModal.classList.add("hidden");
  }

  async function fetchAdminStatus() {
    try {
      const response = await fetch("/admin/status");
      const data = await response.json();
      isAdmin = Boolean(data.is_admin);
    } catch (error) {
      isAdmin = false;
      console.error("Error checking admin status:", error);
    }
    renderAdminControls();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML = details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isAdmin
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      if (isAdmin) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!isAdmin) {
      showMessage("Admin mode is required to unregister students.", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  userMenuToggle.addEventListener("click", () => {
    adminPanel.classList.toggle("hidden");
  });

  adminLoginBtn.addEventListener("click", () => {
    openLoginModal();
  });

  adminLogoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/admin/logout", { method: "POST" });
      const result = await response.json();
      if (response.ok) {
        isAdmin = false;
        renderAdminControls();
        fetchActivities();
        showMessage(result.message, "success");
      } else {
        showMessage(result.detail || "Logout failed", "error");
      }
    } catch (error) {
      showMessage("Logout failed", "error");
      console.error("Error logging out:", error);
    }
  });

  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: adminPasswordInput.value }),
      });
      const result = await response.json();

      if (response.ok) {
        isAdmin = true;
        renderAdminControls();
        closeLoginModal();
        fetchActivities();
        showMessage(result.message, "success");
      } else {
        showMessage(result.detail || "Login failed", "error");
      }
    } catch (error) {
      showMessage("Login failed", "error");
      console.error("Error logging in:", error);
    }
  });

  loginCancelBtn.addEventListener("click", () => {
    closeLoginModal();
  });

  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModal();
    }
  });

  // Initialize app
  await fetchAdminStatus();
  fetchActivities();
});
