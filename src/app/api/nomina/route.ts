import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/db";
import {
  periodosNomina, recibosPago, trabajadores, horasExtras,
  empresas, tasas, contribucionesPensiones
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { calcularNomina } from "@/lib/lottt";
import { getTasaVigente, getSalarioMinimoIndexado } from "@/lib/tasas";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const empresaId = session.empresaId;
  if (!empresaId && session.rol !== "master") return NextResponse.json({ error: "Sin empresa" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "periodos";

  if (tipo === "periodos") {
    const eid = session.rol === "master" ? searchParams.get("empresa_id") || empresaId! : empresaId!;
    const periodos = db
      .select()
      .from(periodosNomina)
      .where(eq(periodosNomina.empresaId, eid))
      .orderBy(desc(periodosNomina.creadoEn))
      .limit(24)
      .all();
    return NextResponse.json({ periodos });
  }

  if (tipo === "recibos") {
    const periodoId = searchParams.get("periodo_id");
    if (!periodoId) return NextResponse.json({ error: "periodo_id requerido" }, { status: 400 });
    const eid = session.rol === "master" ? searchParams.get("empresa_id") || empresaId! : empresaId!;
    const recibos = db
      .select({
        id: recibosPago.id,
        trabajadorId: recibosPago.trabajadorId,
        nombre: trabajadores.nombre,
        apellido: trabajadores.apellido,
        cedula: trabajadores.cedula,
        salarioBase: recibosPago.salarioBase,
        totalAsignaciones: recibosPago.totalAsignaciones,
        totalDeducciones: recibosPago.totalDeducciones,
        salarioNeto: recibosPago.salarioNeto,
        salarioNetoUsd: recibosPago.salarioNetoUsd,
        status: recibosPago.status,
      })
      .from(recibosPago)
      .leftJoin(trabajadores, eq(recibosPago.trabajadorId, trabajadores.id))
      .where(and(eq(recibosPago.periodoId, periodoId), eq(recibosPago.empresaId, eid)))
      .all();
    return NextResponse.json({ recibos });
  }

  return NextResponse.json({ error: "tipo no válido" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["master", "admin", "analista"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;
  const empresaId = session.rol === "master" ? body.empresaId as string : session.empresaId;
  if (!empresaId) return NextResponse.json({ error: "empresa_id requerido" }, { status: 400 });

  const accion = body.accion as string;

  if (accion === "crear_periodo") {
    const id = randomUUID();
    const tasaBCV = getTasaVigente("bcv_usd_ves");
    const tasaRef = tasaBCV ? db.select().from(tasas).where(eq(tasas.valor, tasaBCV.valor)).limit(1).get() : null;

    db.insert(periodosNomina).values({
      id,
      empresaId,
      tipo: body.tipo as string,
      anio: body.anio as number,
      mes: body.mes as number,
      quincena: body.quincena as number | undefined,
      fechaInicio: body.fechaInicio as string,
      fechaFin: body.fechaFin as string,
      status: "borrador",
      tasaBcvId: tasaRef?.id,
    }).run();

    return NextResponse.json({ id, success: true });
  }

  if (accion === "calcular_periodo") {
    const periodoId = body.periodoId as string;
    const periodo = db.select().from(periodosNomina)
      .where(and(eq(periodosNomina.id, periodoId), eq(periodosNomina.empresaId, empresaId)))
      .get();

    if (!periodo) return NextResponse.json({ error: "Periodo no encontrado" }, { status: 404 });

    const empresa = db.select().from(empresas).where(eq(empresas.id, empresaId)).get();
    if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

    const tasaBCV = getTasaVigente("bcv_usd_ves");
    const salarioMinimo = getSalarioMinimoIndexado(tasaBCV?.valor || 36);

    // Get all active trabajadores for this empresa
    const trabList = db.select().from(trabajadores)
      .where(and(eq(trabajadores.empresaId, empresaId), eq(trabajadores.status, "activo")))
      .all();

    const recibosIds: string[] = [];
    for (const trab of trabList) {
      // Get horas extras for this period
      const hextrasList = db.select().from(horasExtras)
        .where(and(
          eq(horasExtras.trabajadorId, trab.id),
          eq(horasExtras.periodoId, periodoId),
          eq(horasExtras.aprobado, true)
        ))
        .all();

      const horasExtrasData = hextrasList.map((h) => ({
        tipo: h.tipoHora as "diurna" | "nocturna" | "diurna_feriado" | "nocturna_feriado",
        cantidad: h.cantidadHoras,
      }));

      const resultado = calcularNomina({
        salarioBase: trab.salarioBase,
        diasTrabajados: 30,
        horasExtras: horasExtrasData,
        cestaBono: trab.cestaBono || 0,
        bonoTransporte: 0,
        otrasAsignaciones: 0,
        adelantoQuincena: 0,
        otrasDeduciones: 0,
        ivssPatronal: empresa.ivssPatronal,
        ivssObrero: empresa.ivssObrero,
        rpePatronal: empresa.rpePatronal,
        rpeObrero: empresa.rpeObrero,
        lphPatronal: empresa.lphPatronal,
        lphObrero: empresa.lphObrero,
        tasaBCV: tasaBCV?.valor || 36,
        salarioMinimoVES: salarioMinimo,
      });

      const reciboId = randomUUID();
      db.insert(recibosPago).values({
        id: reciboId,
        empresaId,
        periodoId,
        trabajadorId: trab.id,
        salarioBase: trab.salarioBase,
        diasTrabajados: 30,
        salarioDiario: resultado.salarioDiario,
        cestaBono: resultado.cestaBono,
        bonoTransporte: resultado.bonoTransporte,
        bonoAlimentacion: 0,
        otrasAsignaciones: resultado.otrasAsignaciones,
        horasExtrasMonto: resultado.horasExtrasMonto,
        totalAsignaciones: resultado.totalAsignaciones,
        ivssObrero: resultado.ivssObrero,
        rpeObrero: resultado.rpeObrero,
        lphObrero: resultado.lphObrero,
        contribucionPensiones: resultado.contribucionPensiones,
        adelantoQuincena: resultado.adelantoQuincena,
        otrasDeduciones: resultado.otrasDeduciones,
        totalDeducciones: resultado.totalDeduciones,
        salarioNeto: resultado.salarioNeto,
        tasaBcv: tasaBCV?.valor,
        salarioNetoUsd: resultado.salarioNetoUSD,
        status: "calculado",
      }).run();

      // CEPP registro
      const ceppId = randomUUID();
      db.insert(contribucionesPensiones).values({
        id: ceppId,
        empresaId,
        trabajadorId: trab.id,
        periodoId,
        baseCalculo: Math.max(trab.salarioBase, salarioMinimo),
        porcentaje: 9,
        monto: resultado.contribucionPensiones,
        tasaBcvAplicada: tasaBCV?.valor,
      }).run();

      recibosIds.push(reciboId);
    }

    // Update periodo status
    db.update(periodosNomina).set({ status: "calculada" })
      .where(eq(periodosNomina.id, periodoId)).run();

    return NextResponse.json({ recibosGenerados: recibosIds.length, success: true });
  }

  if (accion === "aprobar_periodo") {
    const periodoId = body.periodoId as string;
    db.update(periodosNomina)
      .set({ status: "aprobada", aprobadoPor: session.userId, aprobadoEn: new Date().toISOString() })
      .where(and(eq(periodosNomina.id, periodoId), eq(periodosNomina.empresaId, empresaId)))
      .run();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "acción no válida" }, { status: 400 });
}
