// tests/api.test.js
// Integration tests using supertest + Jest.
// A fresh SQLite test DB is created/migrated before each test run and torn down after.

import request from "supertest";
import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { createApp } from "../src/app.js";
import prisma from "../src/utils/prisma.js";

// ── Test setup ─────────────────────────────────────────────────────────────────

const app = createApp();

// Shared state across tests (tokens, item IDs)
const ctx = {};

beforeAll(async () => {
  // Push schema to the test SQLite DB (no migration history needed)
  execSync("npx prisma db push --force-reset", {
    env: { ...process.env, DATABASE_URL: "file:./test.db", NODE_ENV: "test" },
    stdio: "pipe",
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  // Clean up test DB file
  if (existsSync("./test.db")) unlinkSync("./test.db");
  if (existsSync("./test.db-journal")) unlinkSync("./test.db-journal");
});

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_USER = { email: "test@example.com", password: "Passw0rd!" };

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /health", () => {
  it("should return 200 ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. REGISTER
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/register", () => {
  it("rejects missing email", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({ password: "Passw0rd!" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("rejects weak password", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({ email: "a@b.com", password: "weak" });
    expect(res.status).toBe(400);
  });

  it("creates a new user (201)", async () => {
    const res = await request(app).post("/api/register").send(TEST_USER);
    expect(res.status).toBe(201);
    expect(res.body.userId).toBeDefined();
  });

  it("rejects duplicate email (409)", async () => {
    const res = await request(app).post("/api/register").send(TEST_USER);
    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. LOGIN
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/login", () => {
  it("rejects wrong password (401)", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ email: TEST_USER.email, password: "WrongPass1" });
    expect(res.status).toBe(401);
  });

  it("returns access_token and refresh_token on success", async () => {
    const res = await request(app).post("/api/login").send(TEST_USER);
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
    // Persist tokens for subsequent tests
    ctx.accessToken = res.body.access_token;
    ctx.refreshToken = res.body.refresh_token;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. TOKEN REFRESH
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/token/refresh", () => {
  it("returns a new access_token", async () => {
    const res = await request(app)
      .post("/api/token/refresh")
      .send({ refresh_token: ctx.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    ctx.accessToken = res.body.access_token; // update to fresh token
  });

  it("rejects invalid refresh_token", async () => {
    const res = await request(app)
      .post("/api/token/refresh")
      .send({ refresh_token: "bogus_token" });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET /api/me (protected)
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/me", () => {
  it("rejects unauthenticated request", async () => {
    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
  });

  it("returns user profile when authenticated", async () => {
    const res = await request(app)
      .get("/api/me")
      .set(authHeader(ctx.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(TEST_USER.email);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. USER DATA CRUD
// ─────────────────────────────────────────────────────────────────────────────

describe("User data CRUD — /api/me/data", () => {
  it("POST creates a new data item (201)", async () => {
    const res = await request(app)
      .post("/api/me/data")
      .set(authHeader(ctx.accessToken))
      .send({ key: "theme", value: "dark" });
    expect(res.status).toBe(201);
    expect(res.body.item.key).toBe("theme");
    expect(res.body.item.value).toBe("dark");
    ctx.itemId = res.body.item.id;
  });

  it("POST stores complex JSON value", async () => {
    const res = await request(app)
      .post("/api/me/data")
      .set(authHeader(ctx.accessToken))
      .send({ key: "prefs", value: { notifications: true, lang: "en" } });
    expect(res.status).toBe(201);
    expect(res.body.item.value.notifications).toBe(true);
  });

  it("GET returns all items", async () => {
    const res = await request(app)
      .get("/api/me/data")
      .set(authHeader(ctx.accessToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
  });

  it("PUT updates an item", async () => {
    const res = await request(app)
      .put(`/api/me/data/${ctx.itemId}`)
      .set(authHeader(ctx.accessToken))
      .send({ value: "light" });
    expect(res.status).toBe(200);
    expect(res.body.item.value).toBe("light");
  });

  it("PUT rejects update for another user's item (404)", async () => {
    // Use a fake ID that belongs to nobody
    const res = await request(app)
      .put("/api/me/data/99999")
      .set(authHeader(ctx.accessToken))
      .send({ value: "hacked" });
    expect(res.status).toBe(404);
  });

  it("DELETE removes the item", async () => {
    const res = await request(app)
      .delete(`/api/me/data/${ctx.itemId}`)
      .set(authHeader(ctx.accessToken));
    expect(res.status).toBe(200);
  });

  it("GET after delete shows item is gone", async () => {
    const res = await request(app)
      .get("/api/me/data")
      .set(authHeader(ctx.accessToken));
    const found = res.body.items.find((i) => i.id === ctx.itemId);
    expect(found).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. LOGOUT
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/logout", () => {
  it("revokes the refresh_token", async () => {
    const res = await request(app)
      .post("/api/logout")
      .send({ refresh_token: ctx.refreshToken });
    expect(res.status).toBe(200);
  });

  it("refresh_token is no longer valid after logout", async () => {
    const res = await request(app)
      .post("/api/token/refresh")
      .send({ refresh_token: ctx.refreshToken });
    expect(res.status).toBe(401);
  });
});
