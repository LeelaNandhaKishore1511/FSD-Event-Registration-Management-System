const user = requireAuth();
if (user && user.role !== "user") redirectByRole(user.role);
mountNavbar();
setUserBanner();
mountChatbot();

const eventsWrap = document.getElementById("eventsWrap");
const myRegs = document.getElementById("myRegs");
let cachedEvents = [];

const timelineOrder = ["current", "upcoming", "past"];
const timelineLabels = {
  current: "Current Events",
  upcoming: "Upcoming Events",
  past: "Past Events",
};

const formatDate = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString();
};

const getDatePart = (dateValue) => {
  if (typeof dateValue === "string" && dateValue.includes("T")) {
    return dateValue.split("T")[0];
  }

  if (typeof dateValue === "string") {
    return dateValue;
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(
    parsed.getDate(),
  ).padStart(2, "0")}`;
};

const toDateTime = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) return new Date(dateValue);
  return new Date(`${getDatePart(dateValue)}T${timeValue}`);
};

const getTimelineBucket = (event) => {
  const now = new Date();
  const start = toDateTime(event.date, event.time);
  const end = toDateTime(event.endDate || event.date, event.endTime || event.time);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "upcoming";
  }

  if (now < start) return "upcoming";
  if (now > end) return "past";
  return "current";
};

const isDeadlineOver = (event) => {
  if (!event.registrationDeadline) return false;
  const deadline = new Date(event.registrationDeadline);
  if (Number.isNaN(deadline.getTime())) return false;
  return new Date() > deadline;
};

const buildDashboardData = (events, registrations) => {
  const registeredMap = new Map();
  registrations.forEach((reg) => {
    if (!reg.event) return;
    const eventId = String(reg.event._id || reg.event);
    registeredMap.set(eventId, reg);
  });

  const grouped = new Map();

  events.forEach((event) => {
    const mainEventId = String(event.mainEvent?._id || "ungrouped");
    const mainEventName = event.mainEvent?.name || "General Events";
    if (!grouped.has(mainEventId)) {
      grouped.set(mainEventId, {
        id: mainEventId,
        name: mainEventName,
        buckets: {
          registered: { current: [], upcoming: [], past: [] },
          unregistered: { current: [], upcoming: [], past: [] },
        },
      });
    }

    const section = grouped.get(mainEventId);
    const statusKey = registeredMap.has(String(event._id))
      ? "registered"
      : "unregistered";
    const timeline = getTimelineBucket(event);
    section.buckets[statusKey][timeline].push(event);
  });

  grouped.forEach((section) => {
    Object.keys(section.buckets).forEach((status) => {
      timelineOrder.forEach((timeline) => {
        section.buckets[status][timeline].sort(
          (a, b) => new Date(a.date) - new Date(b.date),
        );
      });
    });
  });

  return { grouped: Array.from(grouped.values()), registeredMap };
};

const eventCardTemplate = (event, { registered, timeline, registrationInfo }) => {
  const statusBadge = registered
    ? '<span class="badge text-bg-success">Registered</span>'
    : '<span class="badge text-bg-secondary">Not Registered</span>';
  const timelineBadge =
    timeline === "past"
      ? '<span class="badge text-bg-dark">Past</span>'
      : timeline === "current"
        ? '<span class="badge text-bg-info">Current</span>'
        : '<span class="badge text-bg-primary">Upcoming</span>';

  const deadlineClosed = isDeadlineOver(event);
  const registerDisabled = registered || timeline === "past" || deadlineClosed;
  const registerLabel = registered
    ? "Registered"
    : timeline === "past"
      ? "Event Ended"
      : deadlineClosed
        ? "Deadline Closed"
        : "Register";
  const registerClass = registered ? "btn-success" : "btn-brand";

  return `
    <div class="event-card p-3 h-100">
      <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
        <h6 class="mb-0">${event.name}</h6>
        <div class="d-flex gap-1 flex-wrap">${timelineBadge}${statusBadge}</div>
      </div>
      <div class="small-note mb-2">
        ${formatDate(event.date)} ${event.time ? `| ${event.time}` : ""}
        ${event.endDate ? `to ${formatDate(event.endDate)}` : ""}
        ${event.endTime ? `| ${event.endTime}` : ""}
      </div>
      <div class="small-note mb-2">Venue: ${event.venue || "TBA"}</div>
      <div class="small-note mb-2">Type: ${event.eventType} | Max: ${event.maxParticipants}</div>
      <div class="small-note mb-3">${event.description || "No description provided."}</div>
      <div class="d-flex justify-content-between align-items-center gap-2">
        <span class="small-note">${
          registrationInfo?.team?.teamName
            ? `Team: ${registrationInfo.team.teamName}`
            : ""
        }</span>
        <button
          class="btn btn-sm ${registerClass}"
          data-action="register"
          data-id="${event._id}"
          ${registerDisabled ? "disabled" : ""}
        >${registerLabel}</button>
      </div>
    </div>
  `;
};

const renderTimelineGroup = (events, statusKey, timeline, registeredMap) => {
  if (!events.length) return "";

  return `
    <div class="timeline-group mb-3">
      <h6 class="mb-2">${timelineLabels[timeline]}</h6>
      <div class="row g-3">
        ${events
          .map((event) => {
            const registrationInfo = registeredMap.get(String(event._id));
            return `
              <div class="col-md-6">
                ${eventCardTemplate(event, {
                  registered: statusKey === "registered",
                  timeline,
                  registrationInfo,
                })}
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
};

const renderStatusGroup = (statusData, statusKey, registeredMap) => {
  const title = statusKey === "registered" ? "Registered Events" : "Unregistered Events";
  const sections = timelineOrder
    .map((timeline) =>
      renderTimelineGroup(statusData[timeline], statusKey, timeline, registeredMap),
    )
    .join("");

  if (!sections) return "";

  return `
    <div class="status-group mb-4">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h5 class="mb-0">${title}</h5>
      </div>
      ${sections}
    </div>
  `;
};

const renderEventsByMainEvent = (dashboardData) => {
  const { grouped, registeredMap } = dashboardData;
  if (!grouped.length) {
    eventsWrap.innerHTML = '<p class="small-note">No events available.</p>';
    return;
  }

  eventsWrap.innerHTML = grouped
    .map((section) => {
      const registeredHtml = renderStatusGroup(
        section.buckets.registered,
        "registered",
        registeredMap,
      );
      const unregisteredHtml = renderStatusGroup(
        section.buckets.unregistered,
        "unregistered",
        registeredMap,
      );

      return `
        <div class="main-event-section border rounded p-3 mb-4 bg-white fade-in">
          <h4 class="mb-3">${section.name}</h4>
          ${registeredHtml || '<p class="small-note">No registered events in this main event.</p>'}
          ${unregisteredHtml || '<p class="small-note">No unregistered events in this main event.</p>'}
        </div>
      `;
    })
    .join("");
};

const renderMyRegistrations = (registrations) => {
  if (!registrations.length) {
    myRegs.innerHTML = '<p class="small-note">No registrations yet.</p>';
    return;
  }

  myRegs.innerHTML = registrations
    .map(
      (reg) => `
        <div class="border rounded p-2 mb-2 bg-white">
          <strong>${reg.event?.name || "Event"}</strong><br />
          <span class="small-note">${reg.event?.venue || "Venue not available"}</span><br />
          <span class="small-note">${formatDate(reg.event?.date)} | Status: ${reg.status}${
            reg.team ? ` | Team: ${reg.team.teamName}` : ""
          }</span>
        </div>
      `,
    )
    .join("");
};

const loadDashboard = async () => {
  const [events, registrations] = await Promise.all([
    api("/events"),
    api("/register/my"),
  ]);

  cachedEvents = events;

  const dashboardData = buildDashboardData(events, registrations);
  renderEventsByMainEvent(dashboardData);
  renderMyRegistrations(registrations);
};

eventsWrap.addEventListener("click", async (event) => {
  const registerBtn = event.target.closest('button[data-action="register"]');
  if (!registerBtn || registerBtn.disabled) return;

  const eventId = registerBtn.getAttribute("data-id");
  if (!eventId) return;

  try {
    const selectedEvent = cachedEvents.find(
      (evt) => String(evt._id) === String(eventId),
    );
    if (!selectedEvent) {
      throw new Error("Event details not found");
    }

    let teamId;
    if (selectedEvent.eventType === "team") {
      teamId = prompt("Enter your team ID (leader only):");
      if (!teamId) return;
    }

    await api("/register", {
      method: "POST",
      body: JSON.stringify({ eventId, teamId }),
    });

    await loadDashboard();
    alert("Registered successfully");
  } catch (error) {
    alert(error.message);
  }
});

(async () => {
  try {
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
})();
