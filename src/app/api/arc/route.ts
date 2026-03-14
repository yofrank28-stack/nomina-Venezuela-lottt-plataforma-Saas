import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/db";
import { empresas, trabajadores, periodosNomina, recibosPago } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { generarHtmlARC } from "@/lib/reportes";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const trabajadorId = searchParams.get("trabajador_id");
  const anio = parseInt(searchParams.get("anio") || new Date().getFullYear().toString());

  if (!trabajadorId) {
    return NextResponse.json({ error: "trabajador_id requerido" }, { status: 400 });
  }

  const empresaId = session.empresaId;
  if (!empresaId && session.rol !== "master") {
    return NextResponse.json({ error: "Sin empresa" }, { status: 400 });
  }

  const eid = session.rol === "master" ? (searchParams.get("empresa_id") || empresaId!) : empresaId!;

  const empresa = db.select().from(empresas).where(eq(empresas.id, eid)).get();
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const trabajador = db.select().from(trabajadores)
    .where(and(eq(trabajadores.id, trabajadorId), eq(trabajadores.empresaId, eid)))
    .get();
  if (!trabajador) return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 });

  const fechaInicio = `${anio}-01-01`;
  const fechaFin = `${anio}-12-31`;

  const periodos = db.select({ id: periodosNomina.id })
    .from(periodosNomina)
    .where(and(
      eq(periodosNomina.empresaId, eid),
      gte(periodosNomina.fechaInicio, fechaInicio),
      lte(periodosNomina.fechaFin, fechaFin)
    ))
    .all();

  const periodoIds = periodos.map(p => p.id);

  if (periodoIds.length === 0) {
    return NextResponse.json({ 
      error: "No hay períodos de nómina registrados para el año seleccionado",
      pagos: [],
      totales: { ingresoAnualBruto: 0, totalRetenido: 0, ingresoNetoAnual: 0 }
    });
  }

  const recibos = db.select({
    mes: periodosNomina.mes,
    salarioBase: recibosPago.salarioBase,
    totalAsignaciones: recibosPago.totalAsignaciones,
    ivssObrero: recibosPago.ivssObrero,
    rpeObrero: recibosPago.rpeObrero,
    lphObrero: recibosPago.lphObrero,
    totalDeducciones: recibosPago.totalDeducciones,
    salarioNeto: recibosPago.salarioNeto,
  })
  .from(recibosPago)
  .leftJoin(periodosNomina, eq(recibosPago.periodoId, periodosNomina.id))
  .where(and(
    eq(recibosPago.trabajadorId, trabajadorId),
    eq(recibosPago.empresaId, eid)
  ))
  .all();

  const pagosPorMes: Record<number, typeof recibos[0]> = {};
  for (const r of recibos) {
    if (r.mes && !pagosPorMes[r.mes]) {
      pagosPorMes[r.mes] = r;
    }
  }

  const pagos = [];
  let ingresoAnualBruto = 0;
  let totalRetenido = 0;

  for (let mes = 1; mes <= 12; mes++) {
    const r = pagosPorMes[mes];
    const montoBruto = r ? (r.totalAsignaciones || r.salarioBase) : 0;
    
    let retencionIslr = 0;
    if (montoBruto > 0) {
      const ingresoMensual = montoBruto;
      if (ingresoMensual > 0) {
        const uv = 0.50;
        const deduccion = uv * 0.75;
        const base = Math.max(0, ingresoMensual - deduccion);
        if (base > 0) {
          if (base <= 1000) retencionIslr = base * 0.06;
          else if (base <= 1500) retencionIslr = base * 0.09;
          else if (base <= 2000) retencionIslr = base * 0.12;
          else if (base <= 2500) retencionIslr = base * 0.16;
          else if (base <= 3000) retencionIslr = base * 0.20;
          else retencionIslr = base * 0.34;
        }
      }
    }
    
    const montoNeto = montoBruto - retencionIslr;
    
    ingresoAnualBruto += montoBruto;
    totalRetenido += retencionIslr;

    if (montoBruto > 0 || mes === 12) {
      pagos.push({
        mes,
        montoBruto: Math.round(montoBruto * 100) / 100,
        retencionIslr: Math.round(retencionIslr * 100) / 100,
        montoNeto: Math.round(montoNeto * 100) / 100,
      });
    }
  }

  const data = {
    empresa: {
      razonSocial: empresa.razonSocial,
      rif: empresa.rif,
      direccion: empresa.direccion,
      telefono: empresa.telefono,
    },
    trabajador: {
      nombre: trabajador.nombre,
      apellido: trabajador.apellido,
      cedula: trabajador.cedula,
      fechaIngreso: trabajador.fechaIngreso,
    },
    anioFiscal: anio,
    pagos: pagos.filter(p => p.montoBruto > 0),
    totales: {
      ingresoAnualBruto: Math.round(ingresoAnualBruto * 100) / 100,
      totalRetenido: Math.round(totalRetenido * 100) / 100,
      ingresoNetoAnual: Math.round((ingresoAnualBruto - totalRetenido) * 100) / 100,
    },
    fechaEmision: new Date().toLocaleDateString("es-VE"),
  };

  const html = generarHtmlARC(data);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="ARC_${trabajador.cedula}_${anio}.html"`,
    },
  });
}
