import db from "@/db";
import { empresas, pagosLicencias, usuarios } from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { getTasaVigente } from "@/lib/tasas";

export default async function MasterPage() {
  const totalEmpresas = db.select({ count: count() }).from(empresas).get();
  const empresasActivas = db.select({ count: count() }).from(empresas).where(eq(empresas.licenciaStatus, "activa")).get();
  const empresasTrial = db.select({ count: count() }).from(empresas).where(eq(empresas.licenciaStatus, "trial")).get();
  const pagosPendientes = db.select({ count: count() }).from(pagosLicencias).where(eq(pagosLicencias.status, "pendiente")).get();

  const ultimosRegistros = db.select()
    .from(empresas)
    .orderBy(desc(empresas.creadoEn))
    .limit(8)
    .all();

  const ultimosPagos = db.select({
    id: pagosLicencias.id,
    metodoPago: pagosLicencias.metodoPago,
    referencia: pagosLicencias.referencia,
    monto: pagosLicencias.monto,
    moneda: pagosLicencias.moneda,
    planSolicitado: pagosLicencias.planSolicitado,
    mesesSolicitados: pagosLicencias.mesesSolicitados,
    status: pagosLicencias.status,
    creadoEn: pagosLicencias.creadoEn,
    razonSocial: empresas.razonSocial,
  })
  .from(pagosLicencias)
  .leftJoin(empresas, eq(pagosLicencias.empresaId, empresas.id))
  .where(eq(pagosLicencias.status, "pendiente"))
  .orderBy(desc(pagosLicencias.creadoEn))
  .limit(10)
  .all();

  const tasaBCV = getTasaVigente("bcv_usd_ves");

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">Dashboard Master — Nómina Venezuela</h1>
        {tasaBCV && (
          <div className="bcv-indicator">
            <span className="bcv-dot"></span>
            USD/VES: Bs. {tasaBCV.valor.toFixed(2)}
          </div>
        )}
      </div>
      <div className="page-content">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Total Empresas</div>
            <div className="stat-value">{totalEmpresas?.count || 0}</div>
            <div className="stat-sub">Registradas en plataforma</div>
          </div>
          <div className="stat-card success">
            <div className="stat-label">Licencias Activas</div>
            <div className="stat-value">{empresasActivas?.count || 0}</div>
            <div className="stat-sub">Pagadas y verificadas</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-label">En Período de Prueba</div>
            <div className="stat-value">{empresasTrial?.count || 0}</div>
            <div className="stat-sub">Trial activo</div>
          </div>
          <div className={`stat-card ${(pagosPendientes?.count || 0) > 0 ? "danger" : ""}`}>
            <div className="stat-label">Pagos Pendientes</div>
            <div className="stat-value">{pagosPendientes?.count || 0}</div>
            <div className="stat-sub">Por verificar</div>
          </div>
        </div>

        {/* Pagos pendientes - panel prioritario */}
        {(pagosPendientes?.count || 0) > 0 && (
          <div className="card" style={{ marginBottom: "20px", borderLeft: "4px solid var(--color-warning)" }}>
            <div className="card-header">
              <h2 className="card-title">
                <span style={{ color: "var(--color-warning)" }}>Pagos de Licencia Pendientes de Verificación</span>
              </h2>
              <a href="/master/pagos" className="btn btn-warning btn-sm">Ver todos</a>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Método</th>
                    <th>Referencia</th>
                    <th className="text-right">Monto</th>
                    <th>Plan</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosPagos.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.razonSocial}</td>
                      <td style={{ textTransform: "capitalize" }}>{(p.metodoPago || "").replace("_", " ")}</td>
                      <td className="text-mono text-sm">{p.referencia}</td>
                      <td className="text-right text-mono">{p.monto} {p.moneda}</td>
                      <td style={{ textTransform: "capitalize" }}>{p.planSolicitado} × {p.mesesSolicitados}m</td>
                      <td className="text-muted text-sm">{new Date(p.creadoEn).toLocaleDateString("es-VE")}</td>
                      <td>
                        <a href={`/master/pagos?id=${p.id}`} className="btn btn-primary btn-sm">Verificar</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Últimas Empresas Registradas</h2>
            <a href="/master/empresas" className="btn btn-secondary btn-sm">Ver todas</a>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>RIF</th>
                  <th>Razón Social</th>
                  <th>Plan</th>
                  <th>Estado Licencia</th>
                  <th>Vence</th>
                  <th>Registro</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ultimosRegistros.map((e) => (
                  <tr key={e.id}>
                    <td className="text-mono">{e.rif}</td>
                    <td style={{ fontWeight: 500 }}>{e.razonSocial}</td>
                    <td style={{ textTransform: "capitalize" }}>{e.planLicencia}</td>
                    <td>
                      <span className={`badge ${
                        e.licenciaStatus === "activa" ? "badge-success" :
                        e.licenciaStatus === "trial" ? "badge-info" :
                        e.licenciaStatus === "suspendida" ? "badge-danger" : "badge-warning"
                      }`}>{e.licenciaStatus}</span>
                    </td>
                    <td className="text-muted text-sm">
                      {e.licenciaExpira ? new Date(e.licenciaExpira).toLocaleDateString("es-VE") : "—"}
                    </td>
                    <td className="text-muted text-sm">
                      {new Date(e.creadoEn).toLocaleDateString("es-VE")}
                    </td>
                    <td>
                      <a href={`/master/empresas?id=${e.id}`} className="btn btn-secondary btn-sm">Gestionar</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
