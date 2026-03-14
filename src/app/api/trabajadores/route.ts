import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/db";
import { trabajadores, cargos, centrosCosto } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const empresaId = session.rol === "master"
    ? new URL(request.url).searchParams.get("empresa_id")
    : session.empresaId;

  if (!empresaId) return NextResponse.json({ error: "empresa_id requerido" }, { status: 400 });

  const lista = db
    .select({
      id: trabajadores.id,
      cedula: trabajadores.cedula,
      nombre: trabajadores.nombre,
      apellido: trabajadores.apellido,
      salarioBase: trabajadores.salarioBase,
      monedaSalario: trabajadores.monedaSalario,
      fechaIngreso: trabajadores.fechaIngreso,
      fechaEgreso: trabajadores.fechaEgreso,
      status: trabajadores.status,
      banco: trabajadores.banco,
      numeroCuentaBancaria: trabajadores.numeroCuentaBancaria,
      cestaBono: trabajadores.cestaBono,
      cargoNombre: cargos.nombre,
      centroCostoNombre: centrosCosto.nombre,
    })
    .from(trabajadores)
    .leftJoin(cargos, eq(trabajadores.cargoId, cargos.id))
    .leftJoin(centrosCosto, eq(trabajadores.centroCostoId, centrosCosto.id))
    .where(and(eq(trabajadores.empresaId, empresaId)))
    .all();

  return NextResponse.json({ trabajadores: lista });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["master", "admin", "analista"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;
  const empresaId = session.rol === "master" ? body.empresaId as string : session.empresaId;
  if (!empresaId) return NextResponse.json({ error: "empresa_id requerido" }, { status: 400 });

  const id = randomUUID();
  db.insert(trabajadores).values({
    id,
    empresaId,
    cedula: body.cedula as string,
    nombre: body.nombre as string,
    apellido: body.apellido as string,
    fechaNacimiento: body.fechaNacimiento as string,
    sexo: body.sexo as string,
    estadoCivil: body.estadoCivil as string,
    numeroCuentaBancaria: body.numeroCuentaBancaria as string,
    banco: body.banco as string,
    cargoId: body.cargoId as string,
    centroCostoId: body.centroCostoId as string,
    fechaIngreso: body.fechaIngreso as string,
    tipoContrato: (body.tipoContrato as string) || "tiempo_indeterminado",
    salarioBase: body.salarioBase as number,
    monedaSalario: (body.monedaSalario as string) || "VES",
    nssIvss: body.nssIvss as string,
    cestaBono: (body.cestaBono as number) || 0,
  }).run();

  return NextResponse.json({ id, success: true });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || !["master", "admin", "analista"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;
  const { id, ...data } = body;
  const empresaId = session.rol === "master" ? data.empresaId as string : session.empresaId;

  if (!empresaId || !id) return NextResponse.json({ error: "id y empresa_id requeridos" }, { status: 400 });

  db.update(trabajadores)
    .set({
      cedula: data.cedula as string | undefined,
      nombre: data.nombre as string | undefined,
      apellido: data.apellido as string | undefined,
      salarioBase: data.salarioBase as number | undefined,
      monedaSalario: data.monedaSalario as string | undefined,
      cargoId: data.cargoId as string | undefined,
      centroCostoId: data.centroCostoId as string | undefined,
      banco: data.banco as string | undefined,
      numeroCuentaBancaria: data.numeroCuentaBancaria as string | undefined,
      cestaBono: data.cestaBono as number | undefined,
      status: data.status as string | undefined,
      fechaEgreso: data.fechaEgreso as string | undefined,
      motivoEgreso: data.motivoEgreso as string | undefined,
      actualizadoEn: new Date().toISOString(),
    })
    .where(and(eq(trabajadores.id, id as string), eq(trabajadores.empresaId, empresaId)))
    .run();

  return NextResponse.json({ success: true });
}
