import request from "supertest";
import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { createApp } from "./app.js";
import prisma from "./prisma.js";

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

  it("creates a new user (201)", async () => {
    const res = await request(app).post("/api/register").send(TEST_USER);
    expect(res.status).toBe(201);
    expect(res.body.userId).toBeDefined();
  });
});

describe("POST /api/login", () => {
  it("returns tokens on success", async () => {
    const res = await request(app).post("/api/login").send(TEST_USER);
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    ctx.accessToken = res.body.access_token;
    ctx.refreshToken = res.body.refresh_token;
  });
});

describe("GET /api/me", () => {
  it("returns user profile when authenticated", async () => {
    const res = await request(app)
      .get("/api/me")
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
