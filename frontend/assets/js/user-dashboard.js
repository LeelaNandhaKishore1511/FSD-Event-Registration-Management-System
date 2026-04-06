const user = requireAuth();
if (user && user.role !== "user") redirectByRole(user.role);
mountNavbar();
setUserBanner();
mountChatbot();

const eventsWrap = document.getElementById("eventsWrap");
const myRegs = document.getElementById("myRegs");

const loadEvents = async () => {
  const events = await api("/events");
  eventsWrap.innerHTML = "";

  if (!events.length) {
    eventsWrap.innerHTML = '<p class="small-note">No events available.</p>';
    return;
  }

  events.forEach((evt) => {
    const col = document.createElement("div");
    col.className = "col-md-6";
    col.innerHTML = `
      <div class="event-card p-3 h-100">
        <h6 class="mb-1">${evt.name}</h6>
        <div class="small-note mb-2">${new Date(evt.date).toLocaleDateString()} | ${evt.time} | ${evt.venue}</div>
        <div class="small-note mb-2">Type: ${evt.eventType} | Max: ${evt.maxParticipants}</div>
        <button class="btn btn-sm btn-brand" data-id="${evt._id}">Register</button>
      </div>
    `;

    col.querySelector("button").addEventListener("click", async () => {
      try {
        let teamId;
        if (evt.eventType === "team") {
          teamId = prompt("Enter your team ID (leader only):");
          if (!teamId) return;
        }
        await api("/register", {
          method: "POST",
          body: JSON.stringify({ eventId: evt._id, teamId }),
        });
        alert("Registered successfully");
        await loadMyRegistrations();
      } catch (error) {
        alert(error.message);
      }
    });

    eventsWrap.appendChild(col);
  });
};

const loadMyRegistrations = async () => {
  const regs = await api("/register/my");
  myRegs.innerHTML = regs.length
    ? regs
        .map(
          (r) => `
      <div class="border rounded p-2 mb-2 bg-white">
        <strong>${r.event?.name || "Event"}</strong><br />
        <span class="small-note">${r.event?.venue || ""}</span><br />
        <span class="small-note">Status: ${r.status}${r.team ? ` | Team: ${r.team.teamName}` : ""}</span>
      </div>
    `,
        )
        .join("")
    : '<p class="small-note">No registrations yet.</p>';
};

(async () => {
  try {
    await loadEvents();
    await loadMyRegistrations();
  } catch (error) {
    alert(error.message);
  }
})();
