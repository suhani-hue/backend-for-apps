// src/utils/prisma.js
// Exports a single PrismaClient instance to avoid opening multiple DB connections.
// In test mode a separate SQLite file is used so production data stays clean.

import { PrismaClient } from "@prisma/client";

const dbUrl =
  process.env.NODE_ENV === "test"
    ? "file:./test.db"
    : process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
  // Uncomment to see every query Prisma runs:
  // log: ["query", "info", "warn", "error"],
});

export default prisma;
