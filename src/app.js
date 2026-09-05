import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import oauthRoutes from "./routes/oauth.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }));

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) =>
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() })
  );

  app.use("/api", authRoutes);
  app.use("/api", userRoutes);
  app.use("/api", oauthRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found." });
  });

  app.use(errorHandler);

  return app;
}