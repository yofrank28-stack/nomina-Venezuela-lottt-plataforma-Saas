import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import db from "@/db";
import { trabajadores, cargos, centrosCosto } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import TrabajadoresClient from "./TrabajadoresClient";

export default async function TrabajadoresPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.empresaId) redirect("/login");
  if (session.rol === "trabajador") redirect("/dashboard");

  const empresaId = session.empresaId;

  const listaTrabajadores = db.select({
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
    nssIvss: trabajadores.nssIvss,
    tipoContrato: trabajadores.tipoContrato,
    cargoId: trabajadores.cargoId,
    centroCostoId: trabajadores.centroCostoId,
    cargoNombre: cargos.nombre,
    centroCostoNombre: centrosCosto.nombre,
  })
  .from(trabajadores)
  .leftJoin(cargos, eq(trabajadores.cargoId, cargos.id))
  .leftJoin(centrosCosto, eq(trabajadores.centroCostoId, centrosCosto.id))
  .where(eq(trabajadores.empresaId, empresaId))
  .all();

  const listaCargos = db.select({ id: cargos.id, nombre: cargos.nombre })
    .from(cargos).where(and(eq(cargos.empresaId, empresaId), eq(cargos.activo, true))).all();

  const listaCentros = db.select({ id: centrosCosto.id, nombre: centrosCosto.nombre, codigo: centrosCosto.codigo })
    .from(centrosCosto).where(and(eq(centrosCosto.empresaId, empresaId), eq(centrosCosto.activo, true))).all();

  const canEdit = session.rol === "admin" || session.rol === "analista";

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">Trabajadores</h1>
        <span className="text-muted text-sm">{listaTrabajadores.length} registros</span>
      </div>
      <div className="page-content">
        <TrabajadoresClient
          trabajadores={listaTrabajadores}
          cargos={listaCargos}
          centrosCosto={listaCentros}
          canEdit={canEdit}
        />
      </div>
    </>
  );
}
