import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/db";
import { periodosNomina } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["master", "admin"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json() as Record<string, unknown>;
  const accion = body.accion as string;

  if (accion === "cerrar_periodo") {
    const periodoId = body.periodoId as string;
    const empresaId = session.rol === "master" 
      ? (body.empresaId as string || session.empresaId) 
      : session.empresaId!;

    if (!periodoId || !empresaId) {
      return NextResponse.json({ error: "Período y empresa requeridos" }, { status: 400 });
    }

    const periodo = db.select()
      .from(periodosNomina)
      .where(and(eq(periodosNomina.id, periodoId), eq(periodosNomina.empresaId, empresaId)))
      .get();

    if (!periodo) {
      return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });
    }

    if (periodo.status === "cerrado") {
      return NextResponse.json({ error: "El período ya está cerrado" }, { status: 400 });
    }

    // Close the period
    db.update(periodosNomina)
      .set({
        status: "cerrado",
        aprobadoPor: session.userId,
        aprobadoEn: new Date().toISOString(),
      })
      .where(eq(periodosNomina.id, periodoId))
      .run();

    return NextResponse.json({ 
      success: true, 
      message: `Período ${periodo.anio}-${String(periodo.mes).padStart(2, "0")} cerrado exitosamente` 
    });
  }

  if (accion === "abrir_periodo") {
    const periodoId = body.periodoId as string;
    const empresaId = session.rol === "master" 
      ? (body.empresaId as string || session.empresaId) 
      : session.empresaId;

    if (!periodoId || !empresaId) {
      return NextResponse.json({ error: "Período y empresa requeridos" }, { status: 400 });
    }

    // Only master can reopen periods
    if (session.rol !== "master") {
      return NextResponse.json({ error: "Solo el Master puede reopen períodos cerrados" }, { status: 403 });
    }

    const periodo = db.select()
      .from(periodosNomina)
      .where(and(eq(periodosNomina.id, periodoId), eq(periodosNomina.empresaId, empresaId)))
      .get();

    if (!periodo) {
      return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });
    }

    // Reopen the period (change status back to approved)
    db.update(periodosNomina)
      .set({
        status: "aprobada",
      })
      .where(eq(periodosNomina.id, periodoId))
      .run();

    return NextResponse.json({ 
      success: true, 
      message: `Período ${periodo.anio}-${String(periodo.mes).padStart(2, "0")} reopenido` 
    });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
