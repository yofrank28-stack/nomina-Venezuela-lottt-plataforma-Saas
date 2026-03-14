import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import db from "@/db";
import { empresas, trabajadores, periodosNomina, recibosPago } from "@/db/schema";
import { eq, and, count, sum, desc } from "drizzle-orm";
import { getTasaVigente } from "@/lib/tasas";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.empresaId) redirect("/login");

  const empresaId = session.empresaId;

  // Check onboarding
  const empresa = db.select().from(empresas).where(eq(empresas.id, empresaId)).get();
  if (!empresa) redirect("/login");

  const showOnboarding = !empresa.onboardingCompleto && session.rol === "admin";

  // Stats
  const totalTrabajadores = db.select({ count: count() })
    .from(trabajadores)
    .where(and(eq(trabajadores.empresaId, empresaId), eq(trabajadores.status, "activo")))
    .get();

  const ultimosPeriodos = db.select()
    .from(periodosNomina)
    .where(eq(periodosNomina.empresaId, empresaId))
    .orderBy(desc(periodosNomina.creadoEn))
    .limit(5)
    .all();

  const ultimoPeriodo = ultimosPeriodos[0];

  let totalNominaMes = { total: 0 };
  if (ultimoPeriodo) {
    const res = db.select({ total: sum(recibosPago.salarioNeto) })
      .from(recibosPago)
      .where(and(eq(recibosPago.periodoId, ultimoPeriodo.id), eq(recibosPago.empresaId, empresaId)))
      .get();
    totalNominaMes = { total: Number(res?.total || 0) };
  }

  const tasaBCV = getTasaVigente("bcv_usd_ves");

  const licenciaExpira = empresa.licenciaExpira ? new Date(empresa.licenciaExpira) : null;
  const ahora = new Date();
  const diasParaVencer = licenciaExpira
    ? Math.floor((licenciaExpira.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">Dashboard</h1>
        {tasaBCV && (
          <div className="bcv-indicator">
            <span className="bcv-dot"></span>
            USD/VES: Bs. {tasaBCV.valor.toFixed(2)}
          </div>
        )}
        <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          {new Date().toLocaleDateString("es-VE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      <div className="page-content">
        {showOnboarding && (
          <div className="alert alert-warning">
            <strong>Configuración pendiente.</strong> Complete el proceso de configuración de su empresa para usar todas las funcionalidades.{" "}
            <a href="/dashboard/configuracion" style={{ fontWeight: 600, color: "inherit" }}>Ir a Configuración →</a>
          </div>
        )}

        {empresa.licenciaStatus === "trial" && (
          <div className="alert alert-info">
            <strong>Período de prueba activo.</strong> Para continuar usando el sistema después del período de prueba, realice el pago de su licencia.{" "}
            <a href="/dashboard/configuracion#licencia" style={{ fontWeight: 600, color: "inherit" }}>Ver planes →</a>
          </div>
        )}

        {diasParaVencer !== null && diasParaVencer <= 15 && diasParaVencer >= 0 && (
          <div className="alert alert-warning">
            <strong>Licencia por vencer.</strong> Su licencia vence en {diasParaVencer} días.
          </div>
        )}

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Trabajadores Activos</div>
            <div className="stat-value">{totalTrabajadores?.count || 0}</div>
            <div className="stat-sub">En nómina activa</div>
          </div>

          <div className="stat-card success">
            <div className="stat-label">Nómina Último Período</div>
            <div className="stat-value" style={{ fontSize: "18px" }}>
              Bs. {totalNominaMes.total.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            </div>
            <div className="stat-sub">
              {tasaBCV ? `≈ USD ${(totalNominaMes.total / tasaBCV.valor).toFixed(0)}` : ""}
            </div>
          </div>

          <div className={`stat-card ${empresa.licenciaStatus === "activa" ? "success" : empresa.licenciaStatus === "suspendida" ? "danger" : "warning"}`}>
            <div className="stat-label">Estado de Licencia</div>
            <div className="stat-value" style={{ fontSize: "18px", textTransform: "capitalize" }}>
              {empresa.licenciaStatus}
            </div>
            <div className="stat-sub">{empresa.planLicencia} - {diasParaVencer !== null ? `${diasParaVencer}d restantes` : "Sin fecha"}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Tasa BCV USD/VES</div>
            <div className="stat-value" style={{ fontSize: "18px" }}>
              {tasaBCV ? `Bs. ${tasaBCV.valor.toFixed(2)}` : "N/D"}
            </div>
            <div className="stat-sub">
              {tasaBCV ? new Date(tasaBCV.fechaVigencia).toLocaleDateString("es-VE") : "Sin datos"}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Últimos Períodos de Nómina</h2>
            <a href="/dashboard/nomina" className="btn btn-secondary btn-sm">Ver todos</a>
          </div>

          {ultimosPeriodos.length === 0 ? (
            <p className="text-muted" style={{ textAlign: "center", padding: "24px 0" }}>
              No hay períodos de nómina registrados. <a href="/dashboard/nomina">Crear primer período</a>
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Creado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosPeriodos.map((p) => (
                    <tr key={p.id}>
                      <td className="text-mono">
                        {p.anio}/{String(p.mes).padStart(2, "0")}
                        {p.quincena ? ` Q${p.quincena}` : ""}
                      </td>
                      <td style={{ textTransform: "capitalize" }}>{p.tipo}</td>
                      <td>
                        <span className={`badge ${
                          p.status === "pagada" ? "badge-success" :
                          p.status === "aprobada" ? "badge-primary" :
                          p.status === "calculada" ? "badge-info" :
                          "badge-neutral"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="text-muted text-sm">
                        {new Date(p.creadoEn).toLocaleDateString("es-VE")}
                      </td>
                      <td>
                        <a href={`/dashboard/nomina?periodo=${p.id}`} className="btn btn-secondary btn-sm">
                          Ver
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ marginTop: "20px" }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Información Legal LOTTT</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", fontSize: "13px" }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>Prestaciones Sociales</div>
                <div className="text-muted">Doble Vía (Art. 142 LOTTT)</div>
                <div className="text-muted text-sm">Garantía trimestral + Intereses BCV</div>
                <div className="text-muted text-sm">vs. Retroactividad 30 días/año</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>Vacaciones (Art. 190)</div>
                <div className="text-muted">15 días + 1 por año adicional</div>
                <div style={{ fontWeight: 600, marginBottom: "4px", marginTop: "8px" }}>Bono Vacacional (Art. 192)</div>
                <div className="text-muted">15 días + 1 por año</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>Contrib. Pensiones (CEPP)</div>
                <div className="text-muted">9% sobre base indexada BCV</div>
                <div style={{ fontWeight: 600, marginBottom: "4px", marginTop: "8px" }}>Utilidades (Art. 131)</div>
                <div className="text-muted">{empresa.diasUtilidades} días (configurado)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
