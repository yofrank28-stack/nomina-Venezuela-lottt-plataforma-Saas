import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getHistorialTasas, getTasaVigente, actualizarTasaBCV } from "@/lib/tasas";
import db from "@/db";
import { tasas } from "@/db/schema";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "bcv_usd_ves";
  const historial = searchParams.get("historial") === "true";

  if (historial) {
    return NextResponse.json({ tasas: getHistorialTasas(tipo, 60) });
  }

  const tasa = getTasaVigente(tipo);
  return NextResponse.json({ tasa });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["master", "admin", "analista"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json() as { accion?: string; tipo?: string; valor?: number; fechaVigencia?: string };

  if (body.accion === "actualizar_bcv") {
    const result = await actualizarTasaBCV(session.userId);
    return NextResponse.json(result);
  }

  // Manual override
  if (body.tipo && body.valor) {
    db.insert(tasas).values({
      id: randomUUID(),
      tipo: body.tipo,
      valor: body.valor,
      fechaVigencia: body.fechaVigencia || new Date().toISOString(),
      fuente: "manual",
      creadoPor: session.userId,
    }).run();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
