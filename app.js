import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./auth(1).js";
import userRoutes from "./user.js";
import { errorHandler } from "./errorHandler.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: "*" }));

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
