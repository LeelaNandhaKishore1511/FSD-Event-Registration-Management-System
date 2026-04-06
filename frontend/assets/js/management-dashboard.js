const user = requireAuth();
if (user && user.role !== "management") redirectByRole(user.role);
mountNavbar();
setUserBanner();
mountChatbot();

const form = document.getElementById("eventForm");
const mainEventSelect = document.getElementById("mainEvent");
const eventsList = document.getElementById("eventsList");
const eventsMessage = document.getElementById("eventsMessage");
const registrationMeta = document.getElementById("registrationMeta");
const registrationMessage = document.getElementById("registrationMessage");
const registrationList = document.getElementById("registrationList");
let eventsCache = [];
let editingEventId = null;
let selectedRegistrationEventId = null;

if (form) form.reset();

const toDateInput = (value) => new Date(value).toISOString().slice(0, 10);

const toDateTimeLocalInput = (value) => {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const showEventsMessage = (message, kind = "danger") => {
  if (!eventsMessage) return;
  eventsMessage.className =
    kind === "success"
      ? "text-success small-note mb-2"
      : "text-danger small-note mb-2";
  eventsMessage.textContent = message || "";
};

const showRegistrationMessage = (message, kind = "danger") => {
  if (!registrationMessage) return;
  registrationMessage.className =
    kind === "success"
      ? "text-success small-note mb-2"
      : "text-danger small-note mb-2";
  registrationMessage.textContent = message || "";
};

const clearRegistrationsPanel = () => {
  if (registrationMeta) registrationMeta.textContent = "";
  if (registrationList) registrationList.innerHTML = "";
  showRegistrationMessage("");
};

const renderRegistrations = (event, registrations) => {
  if (!registrationMeta || !registrationList) return;

  registrationMeta.textContent = `${event.name} | ${new Date(event.date).toLocaleDateString()} ${event.time} - ${new Date(event.endDate || event.date).toLocaleDateString()} ${event.endTime || ""} | ${event.venue || "-"}`;

  if (!registrations.length) {
    registrationList.innerHTML =
      '<div class="col-12"><p class="small-note mb-0">No registrations for this sub-event yet.</p></div>';
    return;
  }

  registrationList.innerHTML = registrations
    .map((r) => {
      const userName = escapeHtml(r.user?.name || "-");
      const userEmail = escapeHtml(r.user?.email || "-");
      const teamName = escapeHtml(r.team?.teamName || "-");
      const status = escapeHtml(r.status || "-");

      return `
        <div class="col-12">
          <div class="event-card p-2">
            <div class="fw-semibold">${userName}</div>
            <div class="small-note">${userEmail}</div>
            <div class="small-note">Team: ${teamName}</div>
            <div class="small-note">Status: ${status}</div>
          </div>
        </div>
      `;
    })
    .join("");
};

window.viewRegistrations = async (eventId) => {
  try {
    selectedRegistrationEventId = eventId;
    showRegistrationMessage("");
    const payload = await api(`/register/event/${eventId}`);
    renderRegistrations(payload.event, payload.registrations || []);
  } catch (error) {
    showRegistrationMessage(error.message);
  }
};

const loadMainEvents = async () => {
  const items = await api("/main-events");
  mainEventSelect.innerHTML =
    '<option value="">Select Main Event</option>' +
    items.map((i) => `<option value="${i._id}">${i.name}</option>`).join("");
  mainEventSelect.value = "";
};

const loadEvents = async () => {
  const items = await api("/events");
  eventsCache = items;

  eventsList.innerHTML = items
    .map((i) => {
      if (editingEventId === i._id) {
        return `
      <div class="col-12">
        <div class="event-card p-3">
          <div class="row g-2">
            <div class="col-12"><input id="edit-name-${i._id}" class="form-control" value="${escapeHtml(i.name)}" /></div>
            <div class="col-6">
              <label class="small-note mb-1">Start Date</label>
              <input type="date" id="edit-date-${i._id}" class="form-control" value="${toDateInput(i.date)}" />
            </div>
            <div class="col-6">
              <label class="small-note mb-1">Start Time</label>
              <input type="time" id="edit-time-${i._id}" class="form-control" value="${escapeHtml(i.time || "")}" />
            </div>
            <div class="col-6">
              <label class="small-note mb-1">End Date</label>
              <input type="date" id="edit-endDate-${i._id}" class="form-control" value="${toDateInput(i.endDate || i.date)}" />
            </div>
            <div class="col-6">
              <label class="small-note mb-1">End Time</label>
              <input type="time" id="edit-endTime-${i._id}" class="form-control" value="${escapeHtml(i.endTime || i.time || "")}" />
            </div>
            <div class="col-6"><input id="edit-venue-${i._id}" class="form-control" value="${escapeHtml(i.venue || "")}" placeholder="Venue" /></div>
            <div class="col-12">
              <label class="small-note mb-1">Description</label>
              <textarea id="edit-domain-${i._id}" class="form-control" rows="3" placeholder="Description">${escapeHtml(i.domain || "")}</textarea>
            </div>
            <div class="col-6"><input type="number" id="edit-max-${i._id}" class="form-control" value="${escapeHtml(i.maxParticipants || "")}" placeholder="Max participants" /></div>
            <div class="col-6">
              <select id="edit-type-${i._id}" class="form-select">
                <option value="individual" ${i.eventType === "individual" ? "selected" : ""}>individual</option>
                <option value="team" ${i.eventType === "team" ? "selected" : ""}>team</option>
              </select>
            </div>
            <div class="col-12"><input type="datetime-local" id="edit-deadline-${i._id}" class="form-control" value="${toDateTimeLocalInput(i.registrationDeadline)}" /></div>
            <div class="col-12 d-flex gap-2">
              <button class="btn btn-sm btn-brand" onclick="saveEventChanges('${i._id}')">Save</button>
              <button class="btn btn-sm btn-outline-secondary" onclick="cancelEventEdit()">Cancel</button>
            </div>
          </div>
        </div>
      </div>
      `;
      }

      return `
      <div class="col-12">
        <div class="event-card p-3">
          <h6>${i.name}</h6>
          <div class="small-note mb-2">Start: ${new Date(i.date).toLocaleDateString()} ${i.time}</div>
          <div class="small-note mb-2">End: ${new Date(i.endDate || i.date).toLocaleDateString()} ${i.endTime || "-"}</div>
          <div class="small-note mb-2">Description: ${i.domain || "-"}</div>
          <div class="small-note mb-2">Venue: ${i.venue}</div>
          <button class="btn btn-sm btn-outline-primary me-2" onclick="startEventEdit('${i._id}')">Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteEvent('${i._id}')">Delete</button>
          <button class="btn btn-sm btn-outline-secondary ms-2" onclick="viewRegistrations('${i._id}')">View Registrations</button>
        </div>
      </div>
    `;
    })
    .join("");

  if (
    selectedRegistrationEventId &&
    !items.some((x) => x._id === selectedRegistrationEventId)
  ) {
    selectedRegistrationEventId = null;
    clearRegistrationsPanel();
  }
};

window.startEventEdit = async (id) => {
  editingEventId = id;
  showEventsMessage("");
  await loadEvents();
};

window.cancelEventEdit = async () => {
  editingEventId = null;
  showEventsMessage("");
  await loadEvents();
};

window.saveEventChanges = async (id) => {
  const item = eventsCache.find((x) => x._id === id);
  if (!item) return;

  try {
    const date = document.getElementById(`edit-date-${id}`)?.value;
    const time = document.getElementById(`edit-time-${id}`)?.value;
    const endDate = document.getElementById(`edit-endDate-${id}`)?.value;
    const endTime = document.getElementById(`edit-endTime-${id}`)?.value;
    const registrationDeadlineInput = document.getElementById(
      `edit-deadline-${id}`,
    )?.value;

    await api(`/events/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        mainEvent: item.mainEvent?._id || item.mainEvent,
        name: document.getElementById(`edit-name-${id}`)?.value,
        date,
        time,
        endDate,
        endTime,
        venue: document.getElementById(`edit-venue-${id}`)?.value,
        domain: document.getElementById(`edit-domain-${id}`)?.value,
        maxParticipants: Number(
          document.getElementById(`edit-max-${id}`)?.value,
        ),
        eventType: document.getElementById(`edit-type-${id}`)?.value,
        registrationDeadline: new Date(registrationDeadlineInput).toISOString(),
      }),
    });
    editingEventId = null;
    showEventsMessage("Event updated successfully.", "success");
    await loadEvents();
  } catch (error) {
    showEventsMessage(error.message);
  }
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/events", {
      method: "POST",
      body: JSON.stringify({
        mainEvent: document.getElementById("mainEvent").value,
        name: document.getElementById("name").value,
        date: document.getElementById("date").value,
        time: document.getElementById("time").value,
        endDate: document.getElementById("endDate").value,
        endTime: document.getElementById("endTime").value,
        venue: document.getElementById("venue").value,
        domain: document.getElementById("domain").value,
        maxParticipants: Number(
          document.getElementById("maxParticipants").value,
        ),
        eventType: document.getElementById("eventType").value,
        registrationDeadline: new Date(
          document.getElementById("registrationDeadline").value,
        ).toISOString(),
      }),
    });
    form.reset();
    showEventsMessage("Sub-event created successfully.", "success");
    await loadEvents();
  } catch (error) {
    showEventsMessage(error.message);
  }
});

window.deleteEvent = async (id) => {
  if (!confirm("Delete this event?")) return;
  try {
    await api(`/events/${id}`, { method: "DELETE" });
    if (editingEventId === id) editingEventId = null;
    if (selectedRegistrationEventId === id) {
      selectedRegistrationEventId = null;
      clearRegistrationsPanel();
    }
    showEventsMessage("Event deleted successfully.", "success");
    await loadEvents();
  } catch (error) {
    showEventsMessage(error.message);
  }
};

(async () => {
  try {
    clearRegistrationsPanel();
    await loadMainEvents();
    await loadEvents();
  } catch (e) {
    showEventsMessage(e.message);
  }
})();
