import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTasaVigente } from "@/lib/tasas";

export default async function AyudaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.empresaId) redirect("/login");

  const tasaBCV = getTasaVigente("bcv_usd_ves");
  const tasaActiva = getTasaVigente("tasa_activa_bcv");

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">Centro de Ayuda</h1>
        <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          Preguntas frecuentes sobre Nómina Venezuela
        </div>
      </div>
      <div className="page-content">
        <div className="card" style={{ marginBottom: "20px" }}>
          <div className="card-header">
            <h2 className="card-title">📖 Preguntas Frecuentes</h2>
          </div>
          <div style={{ padding: "0 20px 20px" }}>
            
            <details style={{ marginBottom: "16px", padding: "12px", background: "var(--color-bg-elevated)", borderRadius: "6px" }}>
              <summary style={{ fontWeight: 600, cursor: "pointer", color: "var(--color-primary)" }}>
                ¿Cómo se calcula la Contribución Especial de Protección a las Pensiones (CEPP)?
              </summary>
              <div style={{ marginTop: "12px", fontSize: "13px", lineHeight: "1.6", color: "var(--color-text)" }}>
                <p style={{ marginBottom: "8px" }}>
                  El CEPP es un aporte del <strong>9%</strong> sobre la nómina de cada empresa, según el Decreto 4.466.
                </p>
                <ul style={{ paddingLeft: "20px", marginBottom: "8px" }}>
                  <li>Base de cálculo: Salario base de cada trabajador activo</li>
                  <li>El salario mínimo se indexa al BCV para el cálculo</li>
                  <li>Fórmula: Σ(Salario_Base × 9%) para cada trabajador</li>
                </ul>
                <div style={{ background: "#f0f7ff", padding: "8px", borderRadius: "4px", fontSize: "12px" }}>
                  <strong>Ejemplo:</strong> Si el total de nómina mensual es Bs. 100.000, el CEPP sería Bs. 9.000
                </div>
              </div>
            </details>

            <details style={{ marginBottom: "16px", padding: "12px", background: "var(--color-bg-elevated)", borderRadius: "6px" }}>
              <summary style={{ fontWeight: 600, cursor: "pointer", color: "var(--color-primary)" }}>
                ¿Con qué frecuencia se actualizan las tasas BCV?
              </summary>
              <div style={{ marginTop: "12px", fontSize: "13px", lineHeight: "1.6", color: "var(--color-text)" }}>
                <p style={{ marginBottom: "8px" }}>
                  Las tasas se actualizan automáticamente desde la API del BCV cada vez que se accede al sistema. 
                  También puedes actualizarlas manualmente en la sección de Tasas BCV.
                </p>
                <div style={{ background: "#f0f7ff", padding: "8px", borderRadius: "4px", fontSize: "12px" }}>
                  <strong>Tasa Actual:</strong> Bs. {tasaBCV?.valor?.toFixed(2) || "36.50"} por USD
                </div>
              </div>
            </details>

            <details style={{ marginBottom: "16px", padding: "12px", background: "var(--color-bg-elevated)", borderRadius: "6px" }}>
              <summary style={{ fontWeight: 600, cursor: "pointer", color: "var(--color-primary)" }}>
                ¿Qué es la Doble Vía de Prestaciones Sociales?
              </summary>
              <div style={{ marginTop: "12px", fontSize: "13px", lineHeight: "1.6", color: "var(--color-text)" }}>
                <p style={{ marginBottom: "8px" }}>
                  Según el <strong>Art. 142 LOTTT</strong>, el empleador debe pagarle al trabajador la mayor de estas dos opciones:
                </p>
                <ul style={{ paddingLeft: "20px", marginBottom: "8px" }}>
                  <li><strong>Vía A (Garantía):</strong> 15 días de salario integral por trimestre + intereses generados por el fideicomiso</li>
                  <li><strong>Vía B (Retroactividad):</strong> 30 días de salario integral por cada año de servicio</li>
                </ul>
                <p>El sistema calcula automáticamente ambas vías y aplica la de mayor beneficio.</p>
              </div>
            </details>

            <details style={{ marginBottom: "16px", padding: "12px", background: "var(--color-bg-elevated)", borderRadius: "6px" }}>
              <summary style={{ fontWeight: 600, cursor: "pointer", color: "var(--color-primary)" }}>
                ¿Cómo funciona el cierre de mes?
              </summary>
              <div style={{ marginTop: "12px", fontSize: "13px", lineHeight: "1.6", color: "var(--color-text)" }}>
                <p style={{ marginBottom: "8px" }}>
                  El cierre de mes <strong>bloquea las ediciones</strong> del período de nómina para garantizar la integridad contable. 
                  Una vez cerrado:
                </p>
                <ul style={{ paddingLeft: "20px" }}>
                  <li>No se pueden modificar los recibos de pago</li>
                  <li>Los reportes quedan sellados con la fecha de cierre</li>
                  <li>Solo el usuario Master puede reopen un período cerrado si es necesario</li>
                </ul>
              </div>
            </details>

            <details style={{ marginBottom: "16px", padding: "12px", background: "var(--color-bg-elevated)", borderRadius: "6px" }}>
              <summary style={{ fontWeight: 600, cursor: "pointer", color: "var(--color-primary)" }}>
                ¿Qué significan los diferentes estados de la nómina?
              </summary>
              <div style={{ marginTop: "12px", fontSize: "13px", lineHeight: "1.6", color: "var(--color-text)" }}>
                <ul style={{ paddingLeft: "20px" }}>
                  <li><strong>Borrador:</strong> Período creado, sin calcular</li>
                  <li><strong>Calculada:</strong> Nómina procesada con los montos</li>
                  <li><strong>Aprobada:</strong> Revisada y confirmada</li>
                  <li><strong>Pagada:</strong> Nomina disbursada a los trabajadores</li>
                  <li><strong>Cerrada:</strong> Bloqueada para ediciones (integridad contable)</li>
                </ul>
              </div>
            </details>

            <details style={{ padding: "12px", background: "var(--color-bg-elevated)", borderRadius: "6px" }}>
              <summary style={{ fontWeight: 600, cursor: "pointer", color: "var(--color-primary)" }}>
                ¿Cómo se calculan las vacaciones según la LOTTT?
              </summary>
              <div style={{ marginTop: "12px", fontSize: "13px", lineHeight: "1.6", color: "var(--color-text)" }}>
                <p style={{ marginBottom: "8px" }}>
                  Según los <strong>Art. 190-192 LOTTT</strong>:
                </p>
                <ul style={{ paddingLeft: "20px", marginBottom: "8px" }}>
                  <li><strong>Días de descanso:</strong> 15 días + 1 día adicional por cada año de servicio</li>
                  <li><strong>Bono vacacional:</strong> El mismo número de días de vacaciones</li>
                </ul>
                <div style={{ background: "#f0f7ff", padding: "8px", borderRadius: "4px", fontSize: "12px" }}>
                  <strong>Ejemplo:</strong> Con 3 años de servicio: 15 + 3 = 18 días de vacaciones + 18 días de bono
                </div>
              </div>
            </details>

          </div>
        </div>

        <div className="card" style={{ marginBottom: "20px", borderLeft: "4px solid var(--color-primary)" }}>
          <div className="card-header">
            <h2 className="card-title">📊 Tasas del Sistema</h2>
          </div>
          <div style={{ padding: "0 20px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <div style={{ background: "var(--color-bg-elevated)", padding: "16px", borderRadius: "6px", textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "4px" }}>Tasa BCV USD/VES</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-primary)" }}>Bs. {tasaBCV?.valor?.toFixed(2) || "36.50"}</div>
              </div>
              <div style={{ background: "var(--color-bg-elevated)", padding: "16px", borderRadius: "6px", textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "4px" }}>Tasa Activa BCV</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-warning)" }}>{tasaActiva?.valor?.toFixed(2) || "58.30"}%</div>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "12px", textAlign: "center" }}>
              Las tasas se actualizan automáticamente. Puedes modificarlas manualmente en Configuración → Tasas.
            </p>
          </div>
        </div>

        <div className="alert alert-info">
          <strong>¿Necesitas más ayuda?</strong> Contacta al equipo de soporte de Nómina Venezuela o consulta la documentación técnica.
        </div>
      </div>
    </>
  );
}
