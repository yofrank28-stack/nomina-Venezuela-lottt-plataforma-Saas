import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/db";
import { 
  empresas, usuarios, trabajadores, centrosCosto, cargos,
  tasas, periodosNomina, recibosPago, horasExtras,
  prestacionesSociales, vacaciones, utilidades, contribucionesPensiones
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.rol !== "master") {
    return NextResponse.json({ error: "Solo el Master puede exportar backups" }, { status: 403 });
  }

  const body = await request.json() as Record<string, unknown>;
  const empresaId = body.empresaId as string;

  if (!empresaId) {
    return NextResponse.json({ error: "Empresa requerida" }, { status: 400 });
  }

  // Get empresa info
  const empresa = db.select().from(empresas).where(eq(empresas.id, empresaId)).get();
  if (!empresa) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  // Gather all data for this company
  const data = {
    metadata: {
      exportDate: new Date().toISOString(),
      empresaId,
      empresaNombre: empresa.razonSocial,
      empresaRif: empresa.rif,
    },
    empresa: { ...empresa },
    usuarios: db.select().from(usuarios).where(eq(usuarios.empresaId, empresaId)).all(),
    trabajadores: db.select().from(trabajadores).where(eq(trabajadores.empresaId, empresaId)).all(),
    centrosCosto: db.select().from(centrosCosto).where(eq(centrosCosto.empresaId, empresaId)).all(),
    cargos: db.select().from(cargos).where(eq(cargos.empresaId, empresaId)).all(),
    tasas: db.select().from(tasas).all(),
    periodosNomina: db.select().from(periodosNomina).where(eq(periodosNomina.empresaId, empresaId)).all(),
    recibosPago: db.select().from(recibosPago).where(eq(recibosPago.empresaId, empresaId)).all(),
    horasExtras: db.select().from(horasExtras).where(eq(horasExtras.empresaId, empresaId)).all(),
    prestacionesSociales: db.select().from(prestacionesSociales).where(eq(prestacionesSociales.empresaId, empresaId)).all(),
    vacaciones: db.select().from(vacaciones).where(eq(vacaciones.empresaId, empresaId)).all(),
    utilidades: db.select().from(utilidades).where(eq(utilidades.empresaId, empresaId)).all(),
    contribucionesPensiones: db.select().from(contribucionesPensiones).where(eq(contribucionesPensiones.empresaId, empresaId)).all(),
  };

  // Return as JSON for client-side download
  return NextResponse.json(data);
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.rol !== "master") {
    return NextResponse.json({ error: "Solo el Master puede exportar backups" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");

  if (!empresaId) {
    return NextResponse.json({ error: "Empresa requerida" }, { status: 400 });
  }

  // Verify empresa exists
  const empresa = db.select().from(empresas).where(eq(empresas.id, empresaId)).get();
  if (!empresa) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  // Gather all data for this company
  const data = {
    metadata: {
      exportDate: new Date().toISOString(),
      empresaId,
      empresaNombre: empresa.razonSocial,
      empresaRif: empresa.rif,
      version: "1.0",
    },
    empresa: { ...empresa },
    usuarios: db.select().from(usuarios).where(eq(usuarios.empresaId, empresaId)).all(),
    trabajadores: db.select().from(trabajadores).where(eq(trabajadores.empresaId, empresaId)).all(),
    centrosCosto: db.select().from(centrosCosto).where(eq(centrosCosto.empresaId, empresaId)).all(),
    cargos: db.select().from(cargos).where(eq(cargos.empresaId, empresaId)).all(),
    tasas: db.select().from(tasas).all(),
    periodosNomina: db.select().from(periodosNomina).where(eq(periodosNomina.empresaId, empresaId)).all(),
    recibosPago: db.select().from(recibosPago).where(eq(recibosPago.empresaId, empresaId)).all(),
    horasExtras: db.select().from(horasExtras).where(eq(horasExtras.empresaId, empresaId)).all(),
    prestacionesSociales: db.select().from(prestacionesSociales).where(eq(prestacionesSociales.empresaId, empresaId)).all(),
    vacaciones: db.select().from(vacaciones).where(eq(vacaciones.empresaId, empresaId)).all(),
    utilidades: db.select().from(utilidades).where(eq(utilidades.empresaId, empresaId)).all(),
    contribucionesPensiones: db.select().from(contribucionesPensiones).where(eq(contribucionesPensiones.empresaId, empresaId)).all(),
  };

  return NextResponse.json(data);
}
