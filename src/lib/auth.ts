import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import db from "@/db";
import { usuarios, empresas } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nomina-venezuela-secret-key-2024-change-in-production"
);

export type SessionPayload = {
  userId: string;
  empresaId: string | null;
  rol: "master" | "admin" | "analista" | "trabajador";
  email: string;
  nombre: string;
};

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function login(email: string, password: string) {
  const user = db
    .select({
      id: usuarios.id,
      empresaId: usuarios.empresaId,
      email: usuarios.email,
      passwordHash: usuarios.passwordHash,
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      rol: usuarios.rol,
      activo: usuarios.activo,
    })
    .from(usuarios)
    .where(eq(usuarios.email, email.toLowerCase()))
    .get();

  if (!user || !user.activo) return { error: "Credenciales inválidas" };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { error: "Credenciales inválidas" };

  // Check empresa licencia if not master
  if (user.rol !== "master" && user.empresaId) {
    const empresa = db
      .select({ licenciaStatus: empresas.licenciaStatus, activo: empresas.activo })
      .from(empresas)
      .where(eq(empresas.id, user.empresaId))
      .get();

    if (!empresa || !empresa.activo) return { error: "Empresa inactiva" };
    if (empresa.licenciaStatus === "suspendida") return { error: "Licencia suspendida. Contacte al administrador." };
  }

  // Update last access
  db.update(usuarios)
    .set({ ultimoAcceso: new Date().toISOString(), primerLogin: 0 as unknown as boolean })
    .where(eq(usuarios.id, user.id))
    .run();

  const payload: SessionPayload = {
    userId: user.id,
    empresaId: user.empresaId ?? null,
    rol: user.rol as SessionPayload["rol"],
    email: user.email,
    nombre: `${user.nombre} ${user.apellido}`,
  };

  const token = await createSession(payload);
  return { token, user: payload };
}

export function requireRole(...roles: SessionPayload["rol"][]) {
  return async (): Promise<SessionPayload> => {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");
    if (!roles.includes(session.rol)) throw new Error("FORBIDDEN");
    return session;
  };
}

// Ensure empresa isolation on every DB query
export function withEmpresa(empresaId: string | null, sessionEmpresaId: string | null) {
  if (!empresaId || empresaId !== sessionEmpresaId) {
    throw new Error("FORBIDDEN: empresa mismatch");
  }
}
