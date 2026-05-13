// src/server.js
// Entry point: creates the Express app and starts the HTTP server.
// Handles graceful shutdown on SIGINT / SIGTERM (important for Docker/cloud).

import "dotenv/config";
import { createApp } from "./app.js";
import prisma from "./utils/prisma.js";

const PORT = process.env.PORT || 4000;

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`✅  backend_for_apps running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`   Database URL: ${process.env.DATABASE_URL}`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log("DB disconnected. Bye!");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
