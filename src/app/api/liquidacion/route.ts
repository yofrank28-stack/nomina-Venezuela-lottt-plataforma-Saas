import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/db";
import { empresas, trabajadores, periodosNomina, recibosPago } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generarHtmlLiquidacion } from "@/lib/reportes";
import { getTasaVigente } from "@/lib/tasas";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const trabajadorId = searchParams.get("trabajador_id");

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

  const tasaBCV = getTasaVigente("bcv_usd_ves");
  const tasaBCVValor = tasaBCV?.valor || 36;

  const hoy = new Date();
  const fechaIngreso = new Date(trabajador.fechaIngreso);
  const diffMs = hoy.getTime() - fechaIngreso.getTime();
  const diasServicio = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const anios = Math.floor(diasServicio / 365);
  const meses = Math.floor((diasServicio % 365) / 30);
  const dias = diasServicio % 30;
  const trimestres = Math.floor(diasServicio / 90);

  const diasUtilidades = empresa.diasUtilidades || 15;
  const tasaActiva = getTasaVigente("tasa_activa_bcv");
  const tasaActivaValor = tasaActiva?.valor || 58.30;

  const TASA_MENSUAL = tasaActivaValor / 100 / 12;

  const salarioDiario = trabajador.salarioBase / 30;
  const diasBonoVacacional = 15 + Math.min(anios, 30);
  const alicuotaUtilidades = (diasUtilidades * salarioDiario) / 360;
  const alicuotaBonoVacacional = (diasBonoVacacional * salarioDiario) / 360;
  const salarioIntegralDiario = salarioDiario + alicuotaUtilidades + alicuotaBonoVacacional;

  const diasGarantiaTrimestre = 15;
  const montoGarantiaTrimestre = diasGarantiaTrimestre * salarioIntegralDiario;
  const montoGarantiaTotal = (trimestres || 1) * diasGarantiaTrimestre * salarioIntegralDiario;
  const intereses = montoGarantiaTotal * TASA_MENSUAL;
  const totalViaA = montoGarantiaTotal + intereses;

  const diasRetro = anios * 30;
  const totalViaB = diasRetro * salarioIntegralDiario;

  const viaAplicada = totalViaA > totalViaB ? "garantia" : "retroactividad";

  const montoVacaciones = (15 + anios) * salarioDiario;
  const montoBonoVacacional = (15 + anios) * salarioDiario;
  const utilidades = diasUtilidades * salarioDiario;

  const totalLiquidacion = Math.max(totalViaA, totalViaB) + montoVacaciones + montoBonoVacacional + utilidades;
  const totalLiquidacionUSD = totalLiquidacion / tasaBCVValor;

  const data = {
    empresa: {
      razonSocial: empresa.razonSocial,
      rif: empresa.rif,
      direccion: empresa.direccion,
    },
    trabajador: {
      nombre: trabajador.nombre,
      apellido: trabajador.apellido,
      cedula: trabajador.cedula,
      fechaIngreso: trabajador.fechaIngreso,
      fechaEgreso: hoy.toISOString().split("T")[0],
      cargo: null,
    },
    liquidation: {
      aniosServicio: anios,
      mesesServicio: meses,
      diasServicio: dias,
      prestacionesSociales: {
        montoGarantiaTotal,
        interesesTotal: intereses,
        totalViaGarantia: totalViaA,
        diasRetroactividad: diasRetro,
        totalViaRetroactividad: totalViaB,
        montoFinal: Math.max(totalViaA, totalViaB),
        viaAplicada,
      },
      vacaciones: {
        diasVacaciones: 15 + anios,
        diasBonoVacacional: diasBonoVacacional,
        montoVacaciones,
        montoBonoVacacional,
        montoTotal: montoVacaciones + montoBonoVacacional,
      },
      utilidadesProporcionales: utilidades,
      preaviso: 0,
      totalLiquidacion,
      totalLiquidacionUSD,
    },
    tasaBCV: tasaBCVValor,
    fechaLiquidacion: hoy.toLocaleDateString("es-VE"),
  };

  const html = generarHtmlLiquidacion(data);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="liquidacion_${trabajador.cedula}_${hoy.toISOString().split("T")[0]}.html"`,
    },
  });
}
