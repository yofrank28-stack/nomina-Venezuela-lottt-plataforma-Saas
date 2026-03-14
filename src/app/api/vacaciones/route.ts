import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/db";
import { vacaciones } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["master", "admin", "analista"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const empresaId = session.empresaId;
  if (!empresaId) return NextResponse.json({ error: "Sin empresa" }, { status: 400 });

  const body = await request.json() as Record<string, unknown>;
  const id = randomUUID();

  db.insert(vacaciones).values({
    id,
    empresaId,
    trabajadorId: body.trabajadorId as string,
    anioServicio: body.anioServicio as number,
    diasVacaciones: body.diasVacaciones as number,
    diasBonoVacacional: body.diasBonoVacacional as number,
    fechaInicio: body.fechaInicio as string | undefined,
    salarioDiario: body.salarioDiario as number,
    montoVacaciones: body.montoVacaciones as number,
    montoBonoVacacional: body.montoBonoVacacional as number,
    montoTotal: body.montoTotal as number,
    status: "pendiente",
    aprobadoPor: session.userId,
  }).run();

  return NextResponse.json({ id, success: true });
}
