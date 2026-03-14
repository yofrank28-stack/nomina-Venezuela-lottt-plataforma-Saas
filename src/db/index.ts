import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), "nomina_venezuela.db");

const sqlite = new Database(DB_PATH);

// Performance pragmas for low-resource environments
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("cache_size = -2000"); // 2MB cache
sqlite.pragma("temp_store = MEMORY");

export const db = drizzle(sqlite, { schema });

export default db;
