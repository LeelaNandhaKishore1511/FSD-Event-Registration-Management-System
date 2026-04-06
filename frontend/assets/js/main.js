const API_BASE = "/api";

const getToken = () => localStorage.getItem("token") || "";
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const setAuth = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

const roleDashboardMap = {
  host: "host-dashboard.html",
  organiser: "organiser-dashboard.html",
  management: "management-dashboard.html",
  user: "user-dashboard.html",
};

const redirectByRole = (role) => {
  const page = roleDashboardMap[role] || "login.html";
  window.location.href = page;
};

const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const api = async (url, options = {}) => {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

const requireAuth = () => {
  const user = getUser();
  const token = getToken();
  if (!user || !token) {
    window.location.href = "login.html";
    return null;
  }
  return user;
};

const setUserBanner = () => {
  const user = getUser();
  const el = document.getElementById("userBanner");
  if (!el || !user) return;
  el.textContent = `${user.name} (${user.role})`;
};

const logout = () => {
  clearAuth();
  window.location.href = "login.html";
};

const initPasswordToggles = () => {
  const toggles = document.querySelectorAll(".password-toggle");
  toggles.forEach((btn) => {
    const targetId = btn.getAttribute("data-target");
    const input = document.getElementById(targetId);
    if (!input) return;

    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Hide" : "Show";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });
};

document.addEventListener("DOMContentLoaded", initPasswordToggles);

const mountNavbar = () => {
  const user = getUser();
  if (!user) return;

  const linksByRole = {
    host: [{ label: "Host", href: "host-dashboard.html" }],
    organiser: [{ label: "Organiser", href: "organiser-dashboard.html" }],
    management: [{ label: "Management", href: "management-dashboard.html" }],
    user: [
      { label: "User", href: "user-dashboard.html" },
      { label: "Teams", href: "team-management.html" },
    ],
  };

  const links = linksByRole[user.role] || [];
  const currentPage = window.location.pathname.split("/").pop();

  const nav = document.createElement("nav");
  nav.className = "top-nav glass-card";
  nav.innerHTML = `
    <div class="top-nav-inner">
      <a class="top-brand" href="${roleDashboardMap[user.role] || "login.html"}">University Events</a>
      <div class="top-links">
        ${links
          .map(
            (l) =>
              `<a class="top-link ${currentPage === l.href ? "active" : ""}" href="${l.href}">${l.label}</a>`,
          )
          .join("")}
      </div>
      <div class="top-user">${user.name} (${user.role})</div>
      <button class="btn btn-brand btn-sm" id="navLogoutBtn">Logout</button>
    </div>
  `;

  document.body.prepend(nav);
  const logoutBtn = document.getElementById("navLogoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
};

const mountChatbot = () => {
  const fab = document.createElement("button");
  fab.className = "chatbot-fab";
  fab.innerText = "AI";

  const panel = document.createElement("div");
  panel.className = "chatbot-window";
  panel.innerHTML = `
    <div class="chat-header">Event Assistant</div>
    <div class="chat-body" id="chatBody">
      <div class="msg bot">Hi! Ask me about events, registrations, or teams.</div>
    </div>
    <div class="chat-input-wrap">
      <input id="chatInput" class="form-control" placeholder="Type your message..." />
      <button id="chatSend" class="btn btn-sm btn-brand">Send</button>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  fab.addEventListener("click", () => panel.classList.toggle("active"));

  const chatBody = panel.querySelector("#chatBody");
  const chatInput = panel.querySelector("#chatInput");
  const chatSend = panel.querySelector("#chatSend");

  const addMsg = (text, cls) => {
    const div = document.createElement("div");
    div.className = `msg ${cls}`;
    div.textContent = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  };

  const send = async () => {
    const message = chatInput.value.trim();
    if (!message) return;
    chatInput.value = "";
    addMsg(message, "user");

    try {
      const reply = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ message }),
      }).then((r) => r.json());

      addMsg(reply.reply || "No response", "bot");
      if (Array.isArray(reply.data) && reply.data.length) {
        addMsg(`Found ${reply.data.length} records.`, "bot");
      }
    } catch {
      addMsg("Chatbot is unavailable right now.", "bot");
    }
  };

  chatSend.addEventListener("click", send);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });
};
