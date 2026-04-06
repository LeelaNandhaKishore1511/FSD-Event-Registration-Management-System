const user = requireAuth();
if (user && user.role !== "organiser") redirectByRole(user.role);
mountNavbar();
setUserBanner();
mountChatbot();

const form = document.getElementById("mainEventForm");
const mgmtForm = document.getElementById("mgmtForm");
const mgMainEventSelect = document.getElementById("mgMainEvent");
const list = document.getElementById("mainEventsList");
const mainEventsMessage = document.getElementById("mainEventsMessage");
const subEventsMessage = document.getElementById("subEventsMessage");
const subEventsList = document.getElementById("subEventsList");
const managementUsersList = document.getElementById("managementUsersList");
let mainEventsCache = [];
let editingMainEventId = null;

if (form) form.reset();
if (mgmtForm) mgmtForm.reset();

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const setText = (el, text, kind = "default") => {
  if (!el) return;
  el.className =
    kind === "error"
      ? "text-danger small-note mb-2"
      : kind === "success"
        ? "text-success small-note mb-2"
        : "small-note mb-2";
  el.textContent = text || "";
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/main-events", {
      method: "POST",
      body: JSON.stringify({
        name: document.getElementById("name").value,
        description: document.getElementById("description").value,
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
      }),
    });
    form.reset();
    await loadMainEvents();
    await loadSubEvents();
  } catch (error) {
    alert(error.message);
  }
});

mgmtForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/users/create-management", {
      method: "POST",
      body: JSON.stringify({
        name: document.getElementById("mgName").value,
        email: document.getElementById("mgEmail").value,
        password: document.getElementById("mgPassword").value,
        mainEventId: mgMainEventSelect.value,
      }),
    });
    mgmtForm.reset();
    alert("Management user created");
    await loadManagementUsers();
  } catch (error) {
    alert(error.message);
  }
});

const loadManagementUsers = async () => {
  const users = await api("/users/management");
  managementUsersList.innerHTML = users.length
    ? users
        .map(
          (u) => `
      <div class="col-md-6">
        <div class="event-card p-3 h-100">
          <h6 class="mb-1">${u.name}</h6>
          <div class="small-note mb-2">${u.email}</div>
          <div class="small-note mb-2">Main Event: ${u.assignedMainEvent?.name || "Not assigned"}</div>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteManagementUser('${u._id}')">Delete</button>
        </div>
      </div>
    `,
        )
        .join("")
    : '<p class="small-note">No management users found.</p>';
};

const loadMainEvents = async () => {
  const items = await api("/main-events");
  mainEventsCache = items;
  setText(mainEventsMessage, `${items.length} main event(s) found.`);

  if (mgMainEventSelect) {
    mgMainEventSelect.innerHTML =
      '<option value="">Select Main Event For Management User</option>' +
      items.map((i) => `<option value="${i._id}">${i.name}</option>`).join("");
    mgMainEventSelect.value = "";
  }

  list.innerHTML = items
    .map((i) => {
      const itemClass = items.length === 1 ? "col-12" : "col-12 col-lg-6";

      if (editingMainEventId === i._id) {
        return `
          <div class="${itemClass}">
            <div class="event-card p-3 h-100 main-event-card">
              <div class="row g-2">
                <div class="col-12">
                  <label class="small-note mb-1">Main Event Name</label>
                  <input id="edit-main-name-${i._id}" class="form-control" value="${escapeHtml(i.name)}" />
                </div>
                <div class="col-12">
                  <label class="small-note mb-1">Description</label>
                  <textarea id="edit-main-description-${i._id}" class="form-control" rows="5">${escapeHtml(i.description || "")}</textarea>
                </div>
                <div class="col-6">
                  <label class="small-note mb-1">Start Date</label>
                  <input type="date" id="edit-main-start-${i._id}" class="form-control" value="${new Date(i.startDate).toISOString().slice(0, 10)}" />
                </div>
                <div class="col-6">
                  <label class="small-note mb-1">End Date</label>
                  <input type="date" id="edit-main-end-${i._id}" class="form-control" value="${new Date(i.endDate).toISOString().slice(0, 10)}" />
                </div>
                <div class="col-12 d-flex gap-2 mt-2">
                  <button class="btn btn-sm btn-brand" onclick="saveMainEvent('${i._id}')">Save</button>
                  <button class="btn btn-sm btn-outline-secondary" onclick="cancelMainEventEdit()">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div class="${itemClass}">
          <div class="event-card p-3 h-100 main-event-card">
            <h6>${escapeHtml(i.name)}</h6>
            <div class="small-note mb-2">Start: ${new Date(i.startDate).toLocaleDateString()}</div>
            <div class="small-note mb-2">End: ${new Date(i.endDate).toLocaleDateString()}</div>
            <div class="small-note mb-2">Organiser: ${escapeHtml(i.organiser?.name || "-")}</div>
            <div class="small-note mb-3 description-text">Description: ${escapeHtml(i.description || "-")}</div>
            <button class="btn btn-sm btn-outline-primary me-2" onclick="startMainEventEdit('${i._id}')">Edit</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteMainEvent('${i._id}')">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");

  if (!items.length) {
    list.innerHTML = '<p class="small-note">No main events found.</p>';
  }
};

const loadSubEvents = async () => {
  const items = await api("/events");
  setText(subEventsMessage, `${items.length} sub-event(s) found.`);

  subEventsList.innerHTML = items.length
    ? items
        .map(
          (i) => `
      <div class="col-md-6">
        <div class="event-card p-3 h-100">
          <h6 class="mb-1">${escapeHtml(i.name)}</h6>
          <div class="small-note mb-2">Main Event: ${escapeHtml(i.mainEvent?.name || "-")}</div>
          <div class="small-note mb-2">Start: ${new Date(i.date).toLocaleDateString()} ${escapeHtml(i.time || "")}</div>
          <div class="small-note mb-2">End: ${new Date(i.endDate || i.date).toLocaleDateString()} ${escapeHtml(i.endTime || "-")}</div>
          <div class="small-note mb-2">Venue: ${escapeHtml(i.venue || "-")}</div>
          <div class="small-note mb-2">Event Type: ${escapeHtml(i.eventType || "-")}</div>
          <div class="small-note mb-2">Max Participants: ${escapeHtml(i.maxParticipants ?? "-")}</div>
          <div class="small-note mb-2">Registration Deadline: ${i.registrationDeadline ? new Date(i.registrationDeadline).toLocaleString() : "-"}</div>
          <div class="small-note mb-0">Description: ${escapeHtml(i.description || i.domain || "-")}</div>
        </div>
      </div>
    `,
        )
        .join("")
    : '<p class="small-note">No sub-events found.</p>';
};

window.editMainEvent = async (id) => {
  await window.startMainEventEdit(id);
};

window.startMainEventEdit = async (id) => {
  editingMainEventId = id;
  setText(
    mainEventsMessage,
    "Editing main event inline. Update fields and click Save.",
  );
  await loadMainEvents();
};

window.cancelMainEventEdit = async () => {
  editingMainEventId = null;
  setText(mainEventsMessage, `${mainEventsCache.length} main event(s) found.`);
  await loadMainEvents();
};

window.saveMainEvent = async (id) => {
  const item = mainEventsCache.find((x) => x._id === id);
  if (!item) return;

  try {
    await api(`/main-events/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: document.getElementById(`edit-main-name-${id}`)?.value,
        description: document.getElementById(`edit-main-description-${id}`)
          ?.value,
        startDate: document.getElementById(`edit-main-start-${id}`)?.value,
        endDate: document.getElementById(`edit-main-end-${id}`)?.value,
      }),
    });

    editingMainEventId = null;
    setText(mainEventsMessage, "Main event updated successfully.", "success");
    await loadMainEvents();
    await loadSubEvents();
  } catch (error) {
    setText(mainEventsMessage, error.message, "error");
  }
};

window.deleteMainEvent = async (id) => {
  if (!confirm("Delete this main event?")) return;
  try {
    await api(`/main-events/${id}`, { method: "DELETE" });
    await loadMainEvents();
    await loadSubEvents();
    await loadManagementUsers();
  } catch (error) {
    alert(error.message);
  }
};

window.deleteManagementUser = async (id) => {
  if (!confirm("Delete this management user?")) return;
  try {
    await api(`/users/management/${id}`, { method: "DELETE" });
    await loadManagementUsers();
  } catch (error) {
    alert(error.message);
  }
};

(async () => {
  try {
    await loadMainEvents();
    await loadSubEvents();
    await loadManagementUsers();
  } catch (e) {
    alert(e.message);
    setText(mainEventsMessage, e.message, "error");
    setText(subEventsMessage, e.message, "error");
  }
})();
