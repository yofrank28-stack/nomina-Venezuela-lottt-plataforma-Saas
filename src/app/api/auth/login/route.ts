import { NextRequest, NextResponse } from "next/server";
import { createSession, SessionPayload } from "@/lib/auth";

// MODO DE EMERGENCIA: Bypass para admin@empresa.com
// Este script reemplaza la lógica de login para conceder acceso inmediato
// al usuario especificado, creando una sesión de administrador sin validar la contraseña.

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json() as { email: string };

    if (email.toLowerCase() === 'admin@empresa.com') {
      console.warn("*****************************************************");
      console.warn("** BYPASS DE EMERGENCIA ACTIVO para admin@empresa.com **");
      console.warn("*****************************************************");

      // Payload de sesión para el admin de la empresa
      const payload: SessionPayload = {
        userId: 'user-bypass-emergency-01',
        empresaId: 'dac4a799-418b-439c-b635-25e62c16d557', // ID de K-99 SAC
        role: 'admin',
        email: 'admin@empresa.com',
      };

      const token = await createSession(payload);

      const response = NextResponse.json({
        success: true,
        message: "Acceso de emergencia concedido.",
        user: payload
      }, { status: 200 });

      // Crear la cookie de sesión
      response.cookies.set("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 1, // Sesión de emergencia de 1 hora
        path: '/',
      });

      return response;
    }

    // Bloquear otros intentos de login durante el modo de emergencia
    return NextResponse.json(
      { error: "Sistema en modo de emergencia. Acceso restringido." },
      { status: 403 }
    );

  } catch (err: any) {
    console.error("Error crítico durante el bypass de emergencia:", err.message);
    return NextResponse.json({ error: "Error interno del servidor en modo bypass." }, { status: 500 });
  }
}
