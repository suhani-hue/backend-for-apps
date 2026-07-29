import { PrismaClient } from "@prisma/client";

const dbUrl =
  process.env.NODE_ENV === "test"
    ? "file:./test.db"
    : process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

export default prisma;