import { db } from "./src/db";
import { usuarios } from "./src/db/schema";
import bcrypt from "bcryptjs";

async function seed() {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await db.insert(usuarios).values({
    id: "1",
    email: "admin@empresa.com",
    password: hashedPassword,
    role: "admin",
  }).onConflictDoNothing();
}

seed();
