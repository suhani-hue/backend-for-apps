// frontend-snippet.js
// Sample browser/Node.js code showing how to talk to backend_for_apps.
// Paste this into a browser console or a plain Node.js script.
// No framework required — pure fetch API.

const BASE = "http://localhost:4000/api";

// ── 1. Register ───────────────────────────────────────────────────────────────
async function register(email, password) {
  const res = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json(); // { message, userId }  on 201
}

// ── 2. Login — store tokens in memory (never in localStorage for production) ──
let accessToken = null;
let storedRefreshToken = null;

async function login(email, password) {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (res.ok) {
    accessToken = data.access_token;
    storedRefreshToken = data.refresh_token;
    console.log("Logged in! access_token expires in 15 min.");
  }
  return data;
}

// ── 3. Refresh access token ────────────────────────────────────────────────────
async function refreshAccessToken() {
  const res = await fetch(`${BASE}/token/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: storedRefreshToken }),
  });
  const data = await res.json();
  if (res.ok) {
    accessToken = data.access_token;
    console.log("Token refreshed.");
  }
  return data;
}

// ── 4. Authenticated helper ────────────────────────────────────────────────────
async function authFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
  // If 401, try refreshing token once automatically
  if (res.status === 401) {
    await refreshAccessToken();
    return fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    });
  }
  return res;
}

// ── 5. Get profile ─────────────────────────────────────────────────────────────
async function getMe() {
  const res = await authFetch("/me");
  return res.json(); // { user: { id, email, createdAt } }
}

// ── 6. Store a value ───────────────────────────────────────────────────────────
async function storeValue(key, value) {
  const res = await authFetch("/me/data", {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
  return res.json(); // { item: { id, key, value } }
}

// ── 7. Logout ──────────────────────────────────────────────────────────────────
async function logout() {
  const res = await fetch(`${BASE}/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: storedRefreshToken }),
  });
  accessToken = null;
  storedRefreshToken = null;
  return res.json();
}

// ── Demo run ───────────────────────────────────────────────────────────────────
(async () => {
  console.log(await register("alice@example.com", "Passw0rd!"));
  console.log(await login("alice@example.com", "Passw0rd!"));
  console.log(await getMe());
  console.log(await storeValue("favoriteColor", "blue"));
  console.log(await storeValue("settings", { darkMode: true, fontSize: 16 }));
  console.log(await logout());
})();
