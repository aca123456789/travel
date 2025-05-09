import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required.");
}

export default defineConfig({
  dialect: "postgresql", // "postgresql" | "mysql" | "sqlite"
  schema: "./app/db/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Optional: Specify migration table name
  // migrations: {
  //   table: "migrations"
  // },
  // Optional: Specify verbose output
  // verbose: true,
  // Optional: Specify strict mode
  // strict: true,
}); 
