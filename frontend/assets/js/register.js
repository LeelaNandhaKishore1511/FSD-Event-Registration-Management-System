const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.reset();
}

const registerEmailInput = document.getElementById("email");
const registerPasswordInput = document.getElementById("password");
if (registerEmailInput) registerEmailInput.value = "";
if (registerPasswordInput) registerPasswordInput.value = "";

document
  .getElementById("registerForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById("alertBox");

    try {
      const password = document.getElementById("password").value;
      if (password.length < 6)
        throw new Error("Password must be at least 6 characters");

      const payload = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        password,
        phone: document.getElementById("phone").value.trim(),
        department: document.getElementById("department").value.trim(),
        year: document.getElementById("year").value.trim(),
        collegeName: document.getElementById("collegeName").value.trim(),
        rollNo: document.getElementById("rollNo").value.trim(),
      };

      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setAuth(data.token, data.user);
      alertBox.innerHTML =
        '<div class="alert alert-success">Registration successful. Redirecting...</div>';
      setTimeout(() => redirectByRole(data.user.role), 800);
    } catch (error) {
      alertBox.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    }
  });
