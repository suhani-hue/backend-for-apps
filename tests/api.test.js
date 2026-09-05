import request from "supertest";
import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { createApp } from "../src/app.js";
import prisma from "../src/utils/prisma.js";

const app = createApp();
const ctx = {};

beforeAll(async () => {
  execSync("npx prisma db push --force-reset", {
    env: { ...process.env, DATABASE_URL: "file:./test.db", NODE_ENV: "test" },
    stdio: "pipe",
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  if (existsSync("./test.db")) unlinkSync("./test.db");
  if (existsSync("./test.db-journal")) unlinkSync("./test.db-journal");
});

const TEST_USER = { email: "test@example.com", password: "Passw0rd!" };

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

describe("GET /health", () => {
  it("should return 200 ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("POST /api/register", () => {
  it("rejects missing email", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({ password: "Passw0rd!" });
    expect(res.status).toBe(400);
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

describe("POST /api/login", () => {
  it("rejects wrong password (401)", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ email: TEST_USER.email, password: "WrongPass1" });
    expect(res.status).toBe(401);
  });

  it("returns tokens on success", async () => {
    const res = await request(app).post("/api/login").send(TEST_USER);
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
    ctx.accessToken = res.body.access_token;
    ctx.refreshToken = res.body.refresh_token;
  });
});

describe("POST /api/token/refresh", () => {
  it("returns a new access_token", async () => {
    const res = await request(app)
      .post("/api/token/refresh")
      .send({ refresh_token: ctx.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    ctx.accessToken = res.body.access_token;
  });

  it("rejects invalid refresh_token", async () => {
    const res = await request(app)
      .post("/api/token/refresh")
      .send({ refresh_token: "bogus_token" });
    expect(res.status).toBe(401);
  });
});

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

describe("User data CRUD", () => {
  it("POST creates a new data item (201)", async () => {
    const res = await request(app)
      .post("/api/me/data")
      .set(authHeader(ctx.accessToken))
      .send({ key: "theme", value: "dark" });
    expect(res.status).toBe(201);
    ctx.itemId = res.body.item.id;
  });

  it("GET returns all items", async () => {
    const res = await request(app)
      .get("/api/me/data")
      .set(authHeader(ctx.accessToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("PUT updates an item", async () => {
    const res = await request(app)
      .put(`/api/me/data/${ctx.itemId}`)
      .set(authHeader(ctx.accessToken))
      .send({ value: "light" });
    expect(res.status).toBe(200);
  });

  it("DELETE removes the item", async () => {
    const res = await request(app)
      .delete(`/api/me/data/${ctx.itemId}`)
      .set(authHeader(ctx.accessToken));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/logout", () => {
  it("revokes the refresh_token", async () => {
    const res = await request(app)
      .post("/api/logout")
      .send({ refresh_token: ctx.refreshToken });
    expect(res.status).toBe(200);
  });
});