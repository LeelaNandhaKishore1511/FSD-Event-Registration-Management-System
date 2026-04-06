const user = requireAuth();
if (user && user.role !== "host") redirectByRole(user.role);
mountNavbar();
setUserBanner();
mountChatbot();

const organisersWrap = document.getElementById("organisersWrap");
const organiserForm = document.getElementById("organiserForm");

if (organiserForm) {
  organiserForm.reset();
}

const loadOrganisers = async () => {
  const organisers = await api("/users/organisers");

  organisersWrap.innerHTML = organisers.length
    ? organisers
        .map(
          (o) => `
      <div class="border rounded p-2 mb-2 bg-white">
        <strong>${o.name}</strong><br />
        <span class="small-note">${o.email}</span><br />
        <span class="small-note">Created: ${new Date(o.createdAt).toLocaleString()}</span><br />
        <button class="btn btn-sm btn-outline-danger mt-2" onclick="deleteOrganiser('${o._id}')">Delete</button>
      </div>
    `,
        )
        .join("")
    : '<p class="small-note">No organisers found.</p>';
};

document
  .getElementById("organiserForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/users/create-organiser", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("name").value,
          email: document.getElementById("email").value,
          password: document.getElementById("password").value,
        }),
      });
      e.target.reset();
      alert("Organiser created");
      await loadOrganisers();
    } catch (error) {
      alert(error.message);
    }
  });

loadOrganisers().catch((error) => {
  organisersWrap.innerHTML = `<p class="small-note text-danger">${error.message}</p>`;
});

window.deleteOrganiser = async (id) => {
  if (!confirm("Delete this organiser?")) return;
  try {
    await api(`/users/organisers/${id}`, { method: "DELETE" });
    await loadOrganisers();
  } catch (error) {
    alert(error.message);
  }
};
