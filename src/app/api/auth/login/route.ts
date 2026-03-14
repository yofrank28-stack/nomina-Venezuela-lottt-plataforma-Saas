import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { runMigrations } from "@/db/migrate";

// Ensure DB is initialized on first request
let dbInitialized = false;
function ensureDB() {
  if (!dbInitialized) {
    runMigrations();
    dbInitialized = true;
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureDB();
    const { email, password } = await request.json() as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
    }

    const result = await login(email, password);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({ user: result.user, success: true });
    response.cookies.set("session", result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
