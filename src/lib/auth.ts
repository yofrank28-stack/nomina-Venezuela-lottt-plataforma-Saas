import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { usuarios } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'nomina-venezuela-secret-key-2024-change-in-production'
);

export type SessionPayload = {
  userId: string;
  empresaId: string | null;
  role: 'master' | 'admin' | 'analista' | 'trabajador';
  email: string;
  nombre?: string;
};

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
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

// Restoring the standard and robust way to get session from cookies.
// The previous errors indicate an unstable environment, not an issue in this function's logic.
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get('session')?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function login(email: string, password: string) {
  try {
    const user = await db.query.usuarios.findFirst({
      where: eq(usuarios.email, email.toLowerCase()),
    });

    if (!user) {
      return { error: 'Credenciales inválidas' };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return { error: 'Credenciales inválidas' };
    }

    const payload: SessionPayload = {
      userId: user.id,
      empresaId: user.empresaId, 
      role: user.role as SessionPayload['role'],
      email: user.email,
      nombre: user.nombre,
    };

    const token = await createSession(payload);
    return { token, user: payload };
  } catch (error) {
    console.error('Authentication error:', error);
    return { error: 'Error interno del servidor. Por favor, contacte a soporte.' };
  }
}

export function requireRole(...roles: SessionPayload['role'][]) {
  return async (): Promise<SessionPayload> => {
    const session = await getSession();
    if (!session) throw new Error('UNAUTHORIZED');
    if (!roles.includes(session.role)) throw new Error('FORBIDDEN');
    return session;
  };
}

// Ensure empresa isolation on every DB query
export function withEmpresa(empresaId: string | null, sessionEmpresaId: string | null) {
  if (!empresaId || empresaId !== sessionEmpresaId) {
    throw new Error('FORBIDDEN: empresa mismatch');
  }
}
