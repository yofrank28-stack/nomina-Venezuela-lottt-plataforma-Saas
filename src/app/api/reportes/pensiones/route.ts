import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/db";
import { empresas, trabajadores } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.rol !== "master") {
    return NextResponse.json({ error: "Solo el Master puede ver este reporte" }, { status: 403 });
  }

  const todasEmpresas = db.select({
    id: empresas.id,
    rif: empresas.rif,
    razonSocial: empresas.razonSocial,
    ivssPatronal: empresas.ivssPatronal,
  })
  .from(empresas)
  .all();

  const empresasData = todasEmpresas.map((emp) => {
    const trabajadoresList = db.select({
      id: trabajadores.id,
      nombre: trabajadores.nombre,
      apellido: trabajadores.apellido,
      cedula: trabajadores.cedula,
      salarioBase: trabajadores.salarioBase,
      status: trabajadores.status,
    })
    .from(trabajadores)
    .where(eq(trabajadores.empresaId, emp.id))
    .all();

    const salarioTotal = trabajadoresList
      .filter(t => t.status === "activo")
      .reduce((sum, t) => sum + t.salarioBase, 0);

    const cepp9 = salarioTotal * 0.09;

    return {
      rif: emp.rif,
      razonSocial: emp.razonSocial,
      ivssRiesgo: emp.ivssPatronal,
      numEmpleados: trabajadoresList.filter(t => t.status === "activo").length,
      salarioTotal: Math.round(salarioTotal * 100) / 100,
      cepp9: Math.round(cepp9 * 100) / 100,
    };
  });

  const totalSalario = empresasData.reduce((sum, e) => sum + e.salarioTotal, 0);
  const totalCEPP = empresasData.reduce((sum, e) => sum + e.cepp9, 0);

  return NextResponse.json({
    empresas: empresasData,
    totales: {
      empresas: empresasData.length,
      empleados: empresasData.reduce((sum, e) => sum + e.numEmpleados, 0),
      salarioTotal: Math.round(totalSalario * 100) / 100,
      cepp9Total: Math.round(totalCEPP * 100) / 100,
      equivalenteUSD: Math.round((totalCEPP / 36.50) * 100) / 100,
    },
    fechaGeneracion: new Date().toISOString(),
  });
}
