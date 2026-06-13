import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

let prisma: PrismaClient;

const getPrismaInstance = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not defined.");
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

if (process.env.NODE_ENV === "production") {
  prisma = getPrismaInstance();
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = getPrismaInstance();
  }
  prisma = globalForPrisma.prisma;
}

export { prisma };
