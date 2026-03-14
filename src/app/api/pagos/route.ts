import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/db";
import { pagosLicencias, empresas } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (session.rol === "master") {
    // Master ve todos los pagos pendientes
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pendiente";
    const pagos = db.select({
      id: pagosLicencias.id,
      empresaId: pagosLicencias.empresaId,
      metodoPago: pagosLicencias.metodoPago,
      referencia: pagosLicencias.referencia,
      monto: pagosLicencias.monto,
      moneda: pagosLicencias.moneda,
      fechaPago: pagosLicencias.fechaPago,
      planSolicitado: pagosLicencias.planSolicitado,
      mesesSolicitados: pagosLicencias.mesesSolicitados,
      status: pagosLicencias.status,
      notas: pagosLicencias.notas,
      creadoEn: pagosLicencias.creadoEn,
      razonSocial: empresas.razonSocial,
      rif: empresas.rif,
    })
    .from(pagosLicencias)
    .leftJoin(empresas, eq(pagosLicencias.empresaId, empresas.id))
    .where(eq(pagosLicencias.status, status))
    .orderBy(desc(pagosLicencias.creadoEn))
    .all();
    return NextResponse.json({ pagos });
  }

  // Admin ve sus propios pagos
  const pagos = db.select()
    .from(pagosLicencias)
    .where(eq(pagosLicencias.empresaId, session.empresaId!))
    .orderBy(desc(pagosLicencias.creadoEn))
    .all();
  return NextResponse.json({ pagos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json() as Record<string, unknown>;

  // Admin submits payment
  if (session.rol !== "master") {
    const id = randomUUID();
    db.insert(pagosLicencias).values({
      id,
      empresaId: session.empresaId!,
      metodoPago: body.metodoPago as string,
      referencia: body.referencia as string,
      monto: body.monto as number,
      moneda: body.moneda as string,
      fechaPago: body.fechaPago as string,
      planSolicitado: body.planSolicitado as string,
      mesesSolicitados: (body.mesesSolicitados as number) || 1,
      comprobante: body.comprobante as string | undefined,
      notas: body.notas as string | undefined,
    }).run();
    return NextResponse.json({ id, success: true });
  }

  // Master verifies/rejects payment
  if (session.rol === "master") {
    const pagoId = body.pagoId as string;
    const accion = body.accion as string; // verificar | rechazar

    if (!["verificar", "rechazar"].includes(accion)) {
      return NextResponse.json({ error: "accion inválida" }, { status: 400 });
    }

    const pago = db.select().from(pagosLicencias).where(eq(pagosLicencias.id, pagoId)).get();
    if (!pago) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

    const nuevoStatus = accion === "verificar" ? "verificado" : "rechazado";
    db.update(pagosLicencias)
      .set({
        status: nuevoStatus,
        verificadoPor: session.userId,
        verificadoEn: new Date().toISOString(),
        notas: body.notas as string | undefined,
      })
      .where(eq(pagosLicencias.id, pagoId))
      .run();

    // If verified, activate/extend license
    if (accion === "verificar") {
      const hoy = new Date();
      const expira = new Date(hoy);
      expira.setMonth(expira.getMonth() + (pago.mesesSolicitados || 1));

      db.update(empresas)
        .set({
          licenciaStatus: "activa",
          licenciaExpira: expira.toISOString(),
          planLicencia: pago.planSolicitado,
          actualizadoEn: new Date().toISOString(),
        })
        .where(eq(empresas.id, pago.empresaId))
        .run();
    }

    return NextResponse.json({ success: true, status: nuevoStatus });
  }

  return NextResponse.json({ error: "No autorizado" }, { status: 403 });
}
