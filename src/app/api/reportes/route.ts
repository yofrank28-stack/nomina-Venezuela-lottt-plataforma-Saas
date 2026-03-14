import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/db";
import { recibosPago, trabajadores, empresas, periodosNomina } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  generarArchivoACH,
  generarArchivoTIUNA,
  generarArchivoBanavih,
  generarLibroSalarios,
  generarHtmlRecibo,
} from "@/lib/reportes";
import { getTasaVigente } from "@/lib/tasas";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const periodoId = searchParams.get("periodo_id");
  const reciboId = searchParams.get("recibo_id");

  const empresaId = session.empresaId;
  if (!empresaId && session.rol !== "master") {
    return NextResponse.json({ error: "Sin empresa" }, { status: 400 });
  }
  const eid = empresaId!;

  const empresa = db.select().from(empresas).where(eq(empresas.id, eid)).get();
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const tasaBCV = getTasaVigente("bcv_usd_ves");

  // ─── RECIBO INDIVIDUAL ───────────────────────────────────────────────────────
  if (tipo === "recibo" && reciboId) {
    const recibo = db.select().from(recibosPago)
      .where(and(eq(recibosPago.id, reciboId), eq(recibosPago.empresaId, eid)))
      .get();
    if (!recibo) return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });

    const trabajador = db.select().from(trabajadores).where(eq(trabajadores.id, recibo.trabajadorId)).get();
    if (!trabajador) return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 });

    const periodo = db.select().from(periodosNomina).where(eq(periodosNomina.id, recibo.periodoId)).get();
    if (!periodo) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

    const html = generarHtmlRecibo({
      empresa,
      trabajador: { ...trabajador },
      recibo,
      periodo,
      tasaBCV: tasaBCV?.valor || 36,
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="recibo_${trabajador.cedula}_${periodo.anio}${String(periodo.mes).padStart(2, "0")}.html"`,
      },
    });
  }

  // ─── LIBRO DE SALARIOS ────────────────────────────────────────────────────────
  if (tipo === "libro_salarios" && periodoId) {
    const periodo = db.select().from(periodosNomina)
      .where(and(eq(periodosNomina.id, periodoId), eq(periodosNomina.empresaId, eid)))
      .get();
    if (!periodo) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

    const recibos = db.select({
      id: recibosPago.id,
      empresaId: recibosPago.empresaId,
      periodoId: recibosPago.periodoId,
      trabajadorId: recibosPago.trabajadorId,
      salarioBase: recibosPago.salarioBase,
      diasTrabajados: recibosPago.diasTrabajados,
      salarioDiario: recibosPago.salarioDiario,
      cestaBono: recibosPago.cestaBono,
      bonoTransporte: recibosPago.bonoTransporte,
      bonoAlimentacion: recibosPago.bonoAlimentacion,
      otrasAsignaciones: recibosPago.otrasAsignaciones,
      horasExtrasMonto: recibosPago.horasExtrasMonto,
      totalAsignaciones: recibosPago.totalAsignaciones,
      ivssObrero: recibosPago.ivssObrero,
      rpeObrero: recibosPago.rpeObrero,
      lphObrero: recibosPago.lphObrero,
      contribucionPensiones: recibosPago.contribucionPensiones,
      adelantoQuincena: recibosPago.adelantoQuincena,
      otrasDeduciones: recibosPago.otrasDeduciones,
      totalDeducciones: recibosPago.totalDeducciones,
      salarioNeto: recibosPago.salarioNeto,
      tasaBcv: recibosPago.tasaBcv,
      salarioNetoUsd: recibosPago.salarioNetoUsd,
      status: recibosPago.status,
      creadoEn: recibosPago.creadoEn,
      nombre: trabajadores.nombre,
      apellido: trabajadores.apellido,
      cedula: trabajadores.cedula,
    })
    .from(recibosPago)
    .leftJoin(trabajadores, eq(recibosPago.trabajadorId, trabajadores.id))
    .where(and(eq(recibosPago.periodoId, periodoId), eq(recibosPago.empresaId, eid)))
    .all() as Array<typeof recibosPago.$inferSelect & { nombre: string; apellido: string; cedula: string }>;

    const txt = generarLibroSalarios(empresa, recibos, periodo);
    return new NextResponse(txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="libro_salarios_${periodo.anio}${String(periodo.mes).padStart(2, "0")}.txt"`,
      },
    });
  }

  // ─── ARCHIVO ACH BANESCO ─────────────────────────────────────────────────────
  if ((tipo === "ach_banesco" || tipo === "ach_mercantil") && periodoId) {
    const periodo = db.select().from(periodosNomina)
      .where(and(eq(periodosNomina.id, periodoId), eq(periodosNomina.empresaId, eid)))
      .get();
    if (!periodo) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

    const recibos = db.select({
      salarioNeto: recibosPago.salarioNeto,
      cedula: trabajadores.cedula,
      nombre: trabajadores.nombre,
      apellido: trabajadores.apellido,
      banco: trabajadores.banco,
      numeroCuentaBancaria: trabajadores.numeroCuentaBancaria,
    })
    .from(recibosPago)
    .leftJoin(trabajadores, eq(recibosPago.trabajadorId, trabajadores.id))
    .where(and(eq(recibosPago.periodoId, periodoId), eq(recibosPago.empresaId, eid)))
    .all();

    const registros = recibos
      .filter(r => r.numeroCuentaBancaria)
      .map(r => ({
        cedula: r.cedula || "",
        nombre: `${r.apellido || ""} ${r.nombre || ""}`.trim(),
        banco: r.banco || "",
        numeroCuenta: r.numeroCuentaBancaria || "",
        monto: r.salarioNeto,
      }));

    const banco = tipo === "ach_banesco" ? "banesco" : "mercantil";
    const txt = generarArchivoACH(empresa, registros, periodo.fechaFin, banco);
    return new NextResponse(txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="ach_${banco}_${periodo.anio}${String(periodo.mes).padStart(2, "0")}.txt"`,
      },
    });
  }

  // ─── ARCHIVO TIUNA/IVSS ───────────────────────────────────────────────────────
  if (tipo === "tiuna" && periodoId) {
    const periodo = db.select().from(periodosNomina)
      .where(and(eq(periodosNomina.id, periodoId), eq(periodosNomina.empresaId, eid)))
      .get();
    if (!periodo) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

    const recibos = db.select({
      ivssObrero: recibosPago.ivssObrero,
      salarioBase: recibosPago.salarioBase,
      cedula: trabajadores.cedula,
      nombre: trabajadores.nombre,
      apellido: trabajadores.apellido,
      nssIvss: trabajadores.nssIvss,
    })
    .from(recibosPago)
    .leftJoin(trabajadores, eq(recibosPago.trabajadorId, trabajadores.id))
    .where(and(eq(recibosPago.periodoId, periodoId), eq(recibosPago.empresaId, eid)))
    .all();

    const registros = recibos.map(r => ({
      nss: r.nssIvss || "",
      cedula: r.cedula || "",
      nombre: r.nombre || "",
      apellido: r.apellido || "",
      salarioBase: r.salarioBase,
      ivssObrero: r.ivssObrero,
      ivssPatronal: r.salarioBase * (empresa.ivssPatronal / 100),
      semanasCotizadas: 4,
    }));

    const txt = generarArchivoTIUNA(empresa, registros, periodo.anio, periodo.mes);
    return new NextResponse(txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="tiuna_ivss_${periodo.anio}${String(periodo.mes).padStart(2, "0")}.txt"`,
      },
    });
  }

  // ─── ARCHIVO BANAVIH/LPH ─────────────────────────────────────────────────────
  if (tipo === "banavih" && periodoId) {
    const periodo = db.select().from(periodosNomina)
      .where(and(eq(periodosNomina.id, periodoId), eq(periodosNomina.empresaId, eid)))
      .get();
    if (!periodo) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

    const recibos = db.select({
      lphObrero: recibosPago.lphObrero,
      salarioBase: recibosPago.salarioBase,
      cedula: trabajadores.cedula,
      nombre: trabajadores.nombre,
      apellido: trabajadores.apellido,
    })
    .from(recibosPago)
    .leftJoin(trabajadores, eq(recibosPago.trabajadorId, trabajadores.id))
    .where(and(eq(recibosPago.periodoId, periodoId), eq(recibosPago.empresaId, eid)))
    .all();

    const registros = recibos.map(r => ({
      cedula: r.cedula || "",
      nombre: r.nombre || "",
      apellido: r.apellido || "",
      salarioBase: r.salarioBase,
      lphObrero: r.lphObrero,
      lphPatronal: r.salarioBase * (empresa.lphPatronal / 100),
    }));

    const txt = generarArchivoBanavih(empresa, registros, periodo.anio, periodo.mes);
    return new NextResponse(txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="banavih_lph_${periodo.anio}${String(periodo.mes).padStart(2, "0")}.txt"`,
      },
    });
  }

  return NextResponse.json({ error: "tipo de reporte no válido" }, { status: 400 });
}
