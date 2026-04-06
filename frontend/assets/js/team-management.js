const user = requireAuth();
if (user && user.role !== "user") redirectByRole(user.role);
mountNavbar();
setUserBanner();
mountChatbot();

const eventSelect = document.getElementById("eventId");
const teamSelect = document.getElementById("teamId");
const teamsWrap = document.getElementById("teamsWrap");

const loadTeamEvents = async () => {
  const events = await api("/events");
  const teamEvents = events.filter((e) => e.eventType === "team");
  eventSelect.innerHTML =
    '<option value="">Select Team Event</option>' +
    teamEvents
      .map(
        (e) =>
          `<option value="${e._id}">${e.name} (${new Date(e.date).toLocaleDateString()})</option>`,
      )
      .join("");
};

const loadTeams = async () => {
  const data = await api("/team/my");
  const led = data.ledTeams || [];

  teamSelect.innerHTML =
    '<option value="">Select Team</option>' +
    led.map((t) => `<option value="${t._id}">${t.teamName}</option>`).join("");

  teamsWrap.innerHTML = led.length
    ? led
        .map(
          (t) => `
      <div class="border rounded p-2 mb-2 bg-white">
        <strong>${t.teamName}</strong><br />
        <span class="small-note">${t.event?.name || ""}</span><br />
        <span class="small-note">Team ID: ${t._id}</span>
      </div>
    `,
        )
        .join("")
    : '<p class="small-note">No teams led by you yet.</p>';
};

document.getElementById("teamForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/team/create", {
      method: "POST",
      body: JSON.stringify({
        teamName: document.getElementById("teamName").value,
        eventId: eventSelect.value,
      }),
    });
    e.target.reset();
    await loadTeams();
  } catch (error) {
    alert(error.message);
  }
});

document
  .getElementById("addMemberForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/team/add-member", {
        method: "POST",
        body: JSON.stringify({
          teamId: teamSelect.value,
          userId: document.getElementById("userId").value,
        }),
      });
      alert("Member added");
    } catch (error) {
      alert(error.message);
    }
  });

document.getElementById("removeBtn").addEventListener("click", async () => {
  try {
    await api("/team/remove-member", {
      method: "DELETE",
      body: JSON.stringify({
        teamId: teamSelect.value,
        userId: document.getElementById("userId").value,
      }),
    });
    alert("Member removed");
  } catch (error) {
    alert(error.message);
  }
});

(async () => {
  try {
    await loadTeamEvents();
    await loadTeams();
  } catch (e) {
    alert(e.message);
  }
})();
