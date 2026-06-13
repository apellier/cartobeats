import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

let prisma: PrismaClient;

const getPrismaInstance = () => {
  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_PRISMA_URL || 
    process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error("Database connection URL (DATABASE_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL) is not defined.");
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
