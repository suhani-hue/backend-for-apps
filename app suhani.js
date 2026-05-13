// src/app.js
// Express application factory. Exported separately from server.js so supertest
// can import the app without actually binding to a port during tests.

import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  // ── CORS ──────────────────────────────────────────────────────────────────
  // Parse the CORS_ORIGIN env var — supports comma-separated list of origins
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin '${origin}' not allowed.`));
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ── Health check ──────────────────────────────────────────────────────────
  app.get("/health", (_req, res) =>
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() })
  );

  // ── API Routes ────────────────────────────────────────────────────────────
  app.use("/api", authRoutes);
  app.use("/api", userRoutes);

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found." });
  });

  // ── Centralised error handler (must be last) ──────────────────────────────
  app.use(errorHandler);

  return app;
}
