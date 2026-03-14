import db from "@/db";
import { pagosLicencias, empresas } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import MasterPagosClient from "./MasterPagosClient";

export default async function MasterPagosPage() {
  const pendientes = db.select({
    id: pagosLicencias.id,
    empresaId: pagosLicencias.empresaId,
    metodoPago: pagosLicencias.metodoPago,
    referencia: pagosLicencias.referencia,
    monto: pagosLicencias.monto,
    moneda: pagosLicencias.moneda,
    fechaPago: pagosLicencias.fechaPago,
    planSolicitado: pagosLicencias.planSolicitado,
    mesesSolicitados: pagosLicencias.mesesSolicitados,
    status: pagosLicencias.status,
    notas: pagosLicencias.notas,
    comprobante: pagosLicencias.comprobante,
    creadoEn: pagosLicencias.creadoEn,
    razonSocial: empresas.razonSocial,
    rif: empresas.rif,
    licenciaStatus: empresas.licenciaStatus,
  })
  .from(pagosLicencias)
  .leftJoin(empresas, eq(pagosLicencias.empresaId, empresas.id))
  .orderBy(desc(pagosLicencias.creadoEn))
  .limit(50)
  .all();

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">Validación de Pagos de Licencias</h1>
      </div>
      <div className="page-content">
        <MasterPagosClient pagos={pendientes} />
      </div>
    </>
  );
}
