import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/db";
import { empresas, usuarios, centrosCosto, cargos } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { sendEmail, generateWelcomeEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (session.rol === "master") {
    const lista = db.select().from(empresas).orderBy(desc(empresas.creadoEn)).all();
    return NextResponse.json({ empresas: lista });
  }

  // Admin/Analista ve su propia empresa
  const empresa = db.select().from(empresas).where(eq(empresas.id, session.empresaId!)).get();
  return NextResponse.json({ empresa });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.rol !== "master") {
    return NextResponse.json({ error: "Solo el Master puede crear empresas" }, { status: 403 });
  }

  const body = await request.json() as Record<string, unknown>;
  const accion = body.accion as string;

  if (accion === "crear_empresa") {
    const empresaId = randomUUID();
    db.insert(empresas).values({
      id: empresaId,
      rif: body.rif as string,
      razonSocial: body.razonSocial as string,
      nombreComercial: body.nombreComercial as string | undefined,
      direccion: body.direccion as string | undefined,
      telefono: body.telefono as string | undefined,
      email: body.email as string | undefined,
      planLicencia: (body.planLicencia as string) || "basico",
    }).run();

    // Create admin user for the company
    const adminId = randomUUID();
    const hash = await bcrypt.hash(body.adminPassword as string, 10);
    db.insert(usuarios).values({
      id: adminId,
      empresaId,
      email: body.adminEmail as string,
      passwordHash: hash,
      nombre: body.adminNombre as string,
      apellido: body.adminApellido as string,
      rol: "admin",
    }).run();

    return NextResponse.json({ empresaId, adminId, success: true });
  }

  if (accion === "suspender" || accion === "activar") {
    const empresaId = body.empresaId as string;
    db.update(empresas)
      .set({
        licenciaStatus: accion === "suspender" ? "suspendida" : "activa",
        actualizadoEn: new Date().toISOString(),
      })
      .where(eq(empresas.id, empresaId))
      .run();
    return NextResponse.json({ success: true });
  }

  if (accion === "activar_licencia") {
    const empresaId = body.empresaId as string;
    const meses = (body.meses as number) || 1;
    const plan = (body.plan as string) || "basico";

    // Get empresa info
    const empresa = db.select().from(empresas).where(eq(empresas.id, empresaId)).get();
    if (!empresa) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }

    // Calculate expiration date
    const hoy = new Date();
    const expira = new Date(hoy);
    expira.setMonth(expira.getMonth() + meses);

    // Update license
    db.update(empresas)
      .set({
        licenciaStatus: "activa",
        licenciaExpira: expira.toISOString(),
        planLicencia: plan,
        actualizadoEn: new Date().toISOString(),
      })
      .where(eq(empresas.id, empresaId))
      .run();

    // Get admin user for the company
    const admins = db.select().from(usuarios)
      .where(eq(usuarios.empresaId, empresaId))
      .all();
    const admin = admins.find(u => u.rol === "admin") || admins[0];

    // Send welcome email
    let emailSent = false;
    if (admin) {
      const emailResult = await sendEmail(generateWelcomeEmail(
        empresa.razonSocial,
        empresa.rif,
        admin.email,
        plan,
        meses
      ));
      emailSent = emailResult.success;
    }

    return NextResponse.json({ 
      success: true, 
      licenciaExpira: expira.toISOString(),
      emailSent,
      message: emailSent 
        ? `Licencia activada por ${meses} mes(es). Email de bienvenida enviado.` 
        : `Licencia activada por ${meses} mes(es). No se pudo enviar email.`
    });
  }

  return NextResponse.json({ error: "acción no válida" }, { status: 400 });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || !["master", "admin"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;
  const empresaId = session.rol === "master" ? body.id as string : session.empresaId!;

  db.update(empresas)
    .set({
      rif: body.rif as string | undefined,
      razonSocial: body.razonSocial as string | undefined,
      nombreComercial: body.nombreComercial as string | undefined,
      direccion: body.direccion as string | undefined,
      telefono: body.telefono as string | undefined,
      email: body.email as string | undefined,
      ivssPatronal: body.ivssPatronal as number | undefined,
      ivssObrero: body.ivssObrero as number | undefined,
      rpePatronal: body.rpePatronal as number | undefined,
      rpeObrero: body.rpeObrero as number | undefined,
      lphPatronal: body.lphPatronal as number | undefined,
      lphObrero: body.lphObrero as number | undefined,
      diasUtilidades: body.diasUtilidades as number | undefined,
      periodicidadNomina: body.periodicidadNomina as string | undefined,
      onboardingCompleto: body.onboardingCompleto as boolean | undefined,
      onboardingPaso: body.onboardingPaso as number | undefined,
      actualizadoEn: new Date().toISOString(),
    })
    .where(eq(empresas.id, empresaId))
    .run();

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !["master", "admin"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;
  const accion = body.accion as string;
  const empresaId = session.rol === "master" ? body.empresaId as string : session.empresaId!;

  if (accion === "agregar_centro_costo") {
    const id = randomUUID();
    db.insert(centrosCosto).values({
      id,
      empresaId,
      codigo: body.codigo as string,
      nombre: body.nombre as string,
      descripcion: body.descripcion as string | undefined,
    }).run();
    return NextResponse.json({ id, success: true });
  }

  if (accion === "agregar_cargo") {
    const id = randomUUID();
    db.insert(cargos).values({
      id,
      empresaId,
      nombre: body.nombre as string,
      descripcion: body.descripcion as string | undefined,
      nivel: body.nivel as string | undefined,
    }).run();
    return NextResponse.json({ id, success: true });
  }

  return NextResponse.json({ error: "acción no válida" }, { status: 400 });
}
