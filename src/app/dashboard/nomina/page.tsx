import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import db from "@/db";
import { periodosNomina, recibosPago, trabajadores } from "@/db/schema";
import { eq, and, desc, sum } from "drizzle-orm";
import NominaClient from "./NominaClient";
import { getTasaVigente } from "@/lib/tasas";

export default async function NominaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.empresaId) redirect("/login");
  if (session.rol === "trabajador") redirect("/dashboard");

  const empresaId = session.empresaId;

  const periodos = db.select()
    .from(periodosNomina)
    .where(eq(periodosNomina.empresaId, empresaId))
    .orderBy(desc(periodosNomina.creadoEn))
    .limit(24)
    .all();

  // For each period, get total neto
  const periodosConTotal = await Promise.all(
    periodos.map(async (p) => {
      const res = db.select({ total: sum(recibosPago.salarioNeto), count: sum(recibosPago.diasTrabajados) })
        .from(recibosPago)
        .where(and(eq(recibosPago.periodoId, p.id), eq(recibosPago.empresaId, empresaId)))
        .get();
      const cntRes = db.select({ n: trabajadores.id })
        .from(recibosPago)
        .leftJoin(trabajadores, eq(recibosPago.trabajadorId, trabajadores.id))
        .where(and(eq(recibosPago.periodoId, p.id), eq(recibosPago.empresaId, empresaId)))
        .all();
      return { ...p, totalNeto: Number(res?.total || 0), cantidadRecibos: cntRes.length };
    })
  );

  const tasaBCV = getTasaVigente("bcv_usd_ves");
  const canEdit = session.rol === "admin" || session.rol === "analista";

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">Procesamiento de Nómina</h1>
        {tasaBCV && (
          <div className="bcv-indicator">
            <span className="bcv-dot"></span>
            Tasa BCV: Bs. {tasaBCV.valor.toFixed(2)}
          </div>
        )}
      </div>
      <div className="page-content">
        <NominaClient
          periodos={periodosConTotal}
          tasaBCV={tasaBCV?.valor || 36}
          canEdit={canEdit}
          empresaId={empresaId}
        />
      </div>
    </>
  );
}
