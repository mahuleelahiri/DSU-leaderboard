import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "@/lib/db/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the Neon migration.");
}

const pool = new Pool({ connectionString: databaseUrl });

export const db = drizzle(pool, { schema, casing: "snake_case" });
