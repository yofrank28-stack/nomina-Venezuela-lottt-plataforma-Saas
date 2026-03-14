import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import db from "@/db";
import { vacaciones, trabajadores } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { calcularVacaciones } from "@/lib/lottt";
import VacacionesClient from "./VacacionesClient";

export default async function VacacionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.empresaId) redirect("/login");
  if (session.rol === "trabajador") redirect("/dashboard");

  const empresaId = session.empresaId;

  const registros = db.select({
    id: vacaciones.id,
    trabajadorId: vacaciones.trabajadorId,
    nombre: trabajadores.nombre,
    apellido: trabajadores.apellido,
    cedula: trabajadores.cedula,
    anioServicio: vacaciones.anioServicio,
    diasVacaciones: vacaciones.diasVacaciones,
    diasBonoVacacional: vacaciones.diasBonoVacacional,
    fechaInicio: vacaciones.fechaInicio,
    fechaFin: vacaciones.fechaFin,
    salarioDiario: vacaciones.salarioDiario,
    montoVacaciones: vacaciones.montoVacaciones,
    montoBonoVacacional: vacaciones.montoBonoVacacional,
    montoTotal: vacaciones.montoTotal,
    status: vacaciones.status,
    creadoEn: vacaciones.creadoEn,
  })
  .from(vacaciones)
  .leftJoin(trabajadores, eq(vacaciones.trabajadorId, trabajadores.id))
  .where(eq(vacaciones.empresaId, empresaId))
  .orderBy(desc(vacaciones.creadoEn))
  .all();

  const listaTrabajadores = db.select({
    id: trabajadores.id,
    nombre: trabajadores.nombre,
    apellido: trabajadores.apellido,
    cedula: trabajadores.cedula,
    salarioBase: trabajadores.salarioBase,
    fechaIngreso: trabajadores.fechaIngreso,
  })
  .from(trabajadores)
  .where(and(eq(trabajadores.empresaId, empresaId), eq(trabajadores.status, "activo")))
  .all();

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">Vacaciones</h1>
        <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          Art. 190-192 LOTTT — 15 días + 1 por año
        </div>
      </div>
      <div className="page-content">
        <VacacionesClient
          registros={registros}
          trabajadores={listaTrabajadores}
          canEdit={session.rol === "admin" || session.rol === "analista"}
        />
      </div>
    </>
  );
}
