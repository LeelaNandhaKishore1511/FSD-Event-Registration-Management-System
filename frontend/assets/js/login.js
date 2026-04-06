const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.reset();
}

const loginEmailInput = document.getElementById("email");
const loginPasswordInput = document.getElementById("password");
if (loginEmailInput) loginEmailInput.value = "";
if (loginPasswordInput) loginPasswordInput.value = "";

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const alertBox = document.getElementById("alertBox");

  try {
    const payload = {
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
    };

    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setAuth(data.token, data.user);
    redirectByRole(data.user.role);
  } catch (error) {
    alertBox.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
  }
});
