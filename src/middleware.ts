import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nomina-venezuela-secret-key-2024-change-in-production"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("session")?.value;

  // Si no hay token y no es una ruta pública, redirigir a login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const { role, userId, empresaId, email } = payload as {
      role: string;
      userId: string;
      empresaId?: string;
      email: string;
    };

    // Redirección basada en rol si se intenta acceder a /master
    if (pathname.startsWith("/master") && role !== "master") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Inyectar cabeceras para el uso en Server Components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", userId);
    requestHeaders.set("x-empresa-id", empresaId || "");
    requestHeaders.set("x-role", role);
    requestHeaders.set("x-email", email);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (err) {
    // Si el token es inválido, redirigir a login y limpiar la cookie
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("session");
    return response;
  }
}

export const config = {
  matcher: [
    // Excluir rutas de API, assets de Next.js, y archivos públicos
    "/((?!api|_next/static|_next/image|favicon.ico|login|$).*)"
  ],
};
