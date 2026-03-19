import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import db from "@/db";
import { periodosNomina } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export default async function ReportesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.empresaId) redirect("/login");

  const empresaId = session.empresaId;

  const periodos = db.select({
    id: periodosNomina.id,
    anio: periodosNomina.anio,
    mes: periodosNomina.mes,
    tipo: periodosNomina.tipo,
    status: periodosNomina.status,
    quincena: periodosNomina.quincena,
  })
  .from(periodosNomina)
  .where(eq(periodosNomina.empresaId, empresaId))
  .orderBy(desc(periodosNomina.creadoEn))
  .all();

  const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">Reportes y Archivos</h1>
      </div>
      <div className="page-content">
        <div className="card" style={{ marginBottom: "20px" }}>
          <div className="card-header">
            <h2 className="card-title">Reportes por Período</h2>
          </div>
          <p className="text-muted" style={{ marginBottom: "16px", fontSize: "13px" }}>
            Seleccione un período para generar reportes. Los archivos PDF se abren en el navegador para imprimir.
            Los archivos TXT son formatos listos para subir a portales bancarios y gubernamentales.
          </p>

          {periodos.length === 0 ? (
            <div className="alert alert-info">No hay períodos de nómina procesados aún.</div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Estado</th>
                    <th>PDF / Recibos</th>
                    <th>Libro Salarios</th>
                    <th>Banca</th>
                    <th>Entes Públicos</th>
                  </tr>
                </thead>
                <tbody>
                  {periodos.map((p) => {
                    const disponible = ["calculada", "aprobada", "pagada"].includes(p.status);
                    return (
                      <tr key={p.id}>
                        <td className="text-mono font-semibold">
                          {MESES[p.mes]} {p.anio}
                          {p.quincena ? ` Q${p.quincena}` : ""}
                          <span className="text-muted text-xs" style={{ marginLeft: "6px" }}>({p.tipo})</span>
                        </td>
                        <td>
                          <span className={`badge ${disponible ? "badge-success" : "badge-neutral"}`}>{p.status}</span>
                        </td>
                        <td>
                          {disponible ? (
                            <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                              Ver recibos individuales en &quot;Procesamiento&quot;
                            </div>
                          ) : (
                            <span className="text-muted text-sm">—</span>
                          )}
                        </td>
                        <td>
                          {disponible ? (
                            <a href={`/api/reportes?tipo=libro_salarios&periodo_id=${p.id}`} className="btn btn-secondary btn-sm" target="_blank">
                              .TXT
                            </a>
                          ) : <span className="text-muted text-sm">—</span>}
                        </td>
                        <td>
                          {disponible ? (
                            <div style={{ display: "flex", gap: "4px" }}>
                              <a href={`/api/reportes?tipo=ach_banesco&periodo_id=${p.id}`} className="btn btn-secondary btn-sm" target="_blank">Banesco</a>
                              <a href={`/api/reportes?tipo=ach_mercantil&periodo_id=${p.id}`} className="btn btn-secondary btn-sm" target="_blank">Mercantil</a>
                            </div>
                          ) : <span className="text-muted text-sm">—</span>}
                        </td>
                        <td>
                          {disponible ? (
                            <div style={{ display: "flex", gap: "4px" }}>
                              <a href={`/api/reportes?tipo=tiuna&periodo_id=${p.id}`} className="btn btn-secondary btn-sm" target="_blank">TIUNA/IVSS</a>
                              <a href={`/api/reportes?tipo=banavih&periodo_id=${p.id}`} className="btn btn-secondary btn-sm" target="_blank">BANAVIH</a>
                              <a href={`/api/reportes?tipo=islr&periodo_id=${p.id}`} className="btn btn-secondary btn-sm" target="_blank">ISLR/SENIAT</a>
                            </div>
                          ) : <span className="text-muted text-sm">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Formatos Disponibles</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", fontSize: "13px" }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: "8px" }}>Reportes PDF (Imprimir)</div>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ padding: "4px 0", borderBottom: "1px solid var(--color-border)" }}>✓ Recibo de Pago Individual (Ley de Metrología)</li>
                <li style={{ padding: "4px 0", borderBottom: "1px solid var(--color-border)" }}>✓ Liquidación de Egreso completa</li>
                <li style={{ padding: "4px 0", borderBottom: "1px solid var(--color-border)" }}>✓ Recibos de Vacaciones</li>
                <li style={{ padding: "4px 0" }}>✓ Constancia de Trabajo</li>
                 <li style={{ padding: "4px 0" }}>✓ Libro de Sueldos y Salarios</li>
                <li style={{ padding: "4px 0" }}>✓ Libro de Vacaciones</li>
              </ul>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: "8px" }}>Archivos TXT (Subir a Portales)</div>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ padding: "4px 0", borderBottom: "1px solid var(--color-border)" }}>✓ ACH Banesco — Nómina</li>
                <li style={{ padding: "4px 0", borderBottom: "1px solid var(--color-border)" }}>✓ ACH Mercantil — Nómina</li>
                <li style={{ padding: "4px 0", borderBottom: "1px solid var(--color-border)" }}>✓ TIUNA — IVSS (Seguro Social)</li>
                <li style={{ padding: "4px 0", borderBottom: "1px solid var(--color-border)" }}>✓ BANAVIH — LPH (Vivienda)</li>
                <li style={{ padding: "4px 0" }}>✓ ISLR — SENIAT (XML)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
