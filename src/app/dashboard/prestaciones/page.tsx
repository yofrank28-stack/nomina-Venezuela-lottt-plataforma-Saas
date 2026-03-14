import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import db from "@/db";
import { prestacionesSociales, trabajadores } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getTasaVigente } from "@/lib/tasas";
import PrestacionesClient from "./PrestacionesClient";

export default async function PrestacionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.empresaId) redirect("/login");
  if (session.rol === "trabajador") redirect("/dashboard");

  const empresaId = session.empresaId;

  const registros = db.select({
    id: prestacionesSociales.id,
    trabajadorId: prestacionesSociales.trabajadorId,
    nombre: trabajadores.nombre,
    apellido: trabajadores.apellido,
    cedula: trabajadores.cedula,
    anio: prestacionesSociales.anio,
    trimestre: prestacionesSociales.trimestre,
    salarioDiarioIntegral: prestacionesSociales.salarioDiarioIntegral,
    diasGarantia: prestacionesSociales.diasGarantia,
    montoGarantia: prestacionesSociales.montoGarantia,
    interesesGarantia: prestacionesSociales.interesesGarantia,
    tasaInteresAplicada: prestacionesSociales.tasaInteresAplicada,
    diasRetroactividad: prestacionesSociales.diasRetroactividad,
    montoRetroactividad: prestacionesSociales.montoRetroactividad,
    montoFinal: prestacionesSociales.montoFinal,
    viaAplicada: prestacionesSociales.viaAplicada,
    creadoEn: prestacionesSociales.creadoEn,
  })
  .from(prestacionesSociales)
  .leftJoin(trabajadores, eq(prestacionesSociales.trabajadorId, trabajadores.id))
  .where(eq(prestacionesSociales.empresaId, empresaId))
  .orderBy(desc(prestacionesSociales.creadoEn))
  .all();

  const listaTrabajadores = db.select({ 
      id: trabajadores.id, 
      nombre: trabajadores.nombre, 
      apellido: trabajadores.apellido, 
      cedula: trabajadores.cedula, 
      salarioBase: trabajadores.salarioBase, 
      fechaIngreso: trabajadores.fechaIngreso,
      banco: trabajadores.banco,
      numeroCuentaBancaria: trabajadores.numeroCuentaBancaria,
    })
    .from(trabajadores)
    .where(and(eq(trabajadores.empresaId, empresaId), eq(trabajadores.status, "activo")))
    .all();

  const tasaBCV = getTasaVigente("bcv_usd_ves");
  const tasaActiva = getTasaVigente("tasa_activa_bcv");

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">Prestaciones Sociales</h1>
        <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          Motor LOTTT - Doble Vía (Art. 142)
        </div>
      </div>
      <div className="page-content">
        <div className="alert alert-info">
          <strong>Doble Vía (Art. 142 LOTTT):</strong> El sistema calcula automáticamente ambas vías y aplica la de mayor beneficio para el trabajador:
          <strong> Vía A</strong> (Garantía trimestral + Intereses BCV) vs. <strong>Vía B</strong> (Retroactividad: 30 días/año × Salario Integral actual).
          Tasa activa BCV vigente: {tasaActiva ? `${tasaActiva.valor}%` : "No configurada"}
        </div>
        <PrestacionesClient
          registros={registros}
          trabajadores={listaTrabajadores}
          tasaBCV={tasaBCV?.valor || 36}
          tasaActivaBCV={tasaActiva?.valor || 28.5}
          canEdit={session.rol === "admin" || session.rol === "analista"}
        />
      </div>
    </>
  );
}
