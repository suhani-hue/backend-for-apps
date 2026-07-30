import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./auth(1).js";
import userRoutes from "./user.js";
import { errorHandler } from "./errorHandler.js";

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGIN || "*")
    .split(",")
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin '${origin}' not allowed.`));
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) =>
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() })
  );

  app.use("/api", authRoutes);
  app.use("/api", userRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found." });
  });

  app.use(errorHandler);

  return app;
}
