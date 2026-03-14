"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { calcularPrestacionesSociales, calcularLiquidacion, formatBs } from "@/lib/lottt";

interface Registro {
  id: string;
  trabajadorId: string;
  nombre: string | null;
  apellido: string | null;
  cedula: string | null;
  anio: number;
  trimestre: number;
  salarioDiarioIntegral: number;
  diasGarantia: number;
  montoGarantia: number;
  interesesGarantia: number;
  tasaInteresAplicada: number | null;
  diasRetroactividad: number;
  montoRetroactividad: number;
  montoFinal: number;
  viaAplicada: string;
  creadoEn: string;
}

interface TrabajadorBasic {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  salarioBase: number;
  fechaIngreso: string;
}

interface Props {
  registros: Registro[];
  trabajadores: TrabajadorBasic[];
  tasaBCV: number;
  tasaActivaBCV: number;
  canEdit: boolean;
}

export default function PrestacionesClient({ registros, trabajadores, tasaBCV, tasaActivaBCV, canEdit }: Props) {
  const router = useRouter();
  const [showCalc, setShowCalc] = useState(false);
  const [showLiq, setShowLiq] = useState(false);
  const [selectedTrab, setSelectedTrab] = useState("");
  const [diasUtil, setDiasUtil] = useState(15);
  const [calcResult, setCalcResult] = useState<ReturnType<typeof calcularPrestacionesSociales> | null>(null);
  const [liqResult, setLiqResult] = useState<ReturnType<typeof calcularLiquidacion> | null>(null);
  const [motivoEgreso, setMotivoEgreso] = useState("renuncia");

  function calcularSimulacion() {
    const trab = trabajadores.find((t) => t.id === selectedTrab);
    if (!trab) return;
    const ingreso = new Date(trab.fechaIngreso);
    const hoy = new Date();
    const diffDias = Math.floor((hoy.getTime() - ingreso.getTime()) / (1000 * 60 * 60 * 24));
    const anios = Math.floor(diffDias / 365);
    const trimestres = Math.floor(diffDias / 90);

    const result = calcularPrestacionesSociales({
      salarioBase: trab.salarioBase,
      diasUtilidades: diasUtil,
      aniosServicio: anios,
      mesesServicio: Math.floor((diffDias % 365) / 30),
      trimestresAcumulados: trimestres,
      interesesAcumulados: 0,
      tasaInteresBCV: tasaActivaBCV,
    });
    setCalcResult(result);
  }

  function calcularLiqSimulacion() {
    const trab = trabajadores.find((t) => t.id === selectedTrab);
    if (!trab) return;
    const result = calcularLiquidacion({
      salarioBase: trab.salarioBase,
      diasUtilidades: diasUtil,
      fechaIngreso: trab.fechaIngreso,
      fechaEgreso: new Date().toISOString().split("T")[0],
      motivoEgreso,
      tasaInteresBCV: tasaActivaBCV,
      interesesPrestacionesAcumulados: 0,
      tasaBCV,
    });
    setLiqResult(result);
  }

  const fmt = formatBs;
  const totalGarantia = registros.reduce((a, r) => a + r.montoFinal, 0);

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        <div className="stat-card">
          <div className="stat-label">Registros Trimestrales</div>
          <div className="stat-value">{registros.length}</div>
          <div className="stat-sub">Histórico total</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Total Acumulado (Ref.)</div>
          <div className="stat-value" style={{ fontSize: "16px" }}>Bs. {fmt(totalGarantia)}</div>
          <div className="stat-sub">≈ USD {(totalGarantia / tasaBCV).toFixed(0)}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Tasa Activa BCV</div>
          <div className="stat-value" style={{ fontSize: "20px" }}>{tasaActivaBCV}%</div>
          <div className="stat-sub">Para intereses prestaciones</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        {canEdit && (
          <>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowCalc(true); setCalcResult(null); }}>
              Simular Prestaciones
            </button>
            <button className="btn btn-warning btn-sm" onClick={() => { setShowLiq(true); setLiqResult(null); }}>
              Calcular Liquidación
            </button>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Historial de Prestaciones Sociales</h2>
        </div>
        {registros.length === 0 ? (
          <p className="text-muted" style={{ textAlign: "center", padding: "32px" }}>
            No hay registros de prestaciones. Se generan automáticamente al procesar la nómina trimestral.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th>Período</th>
                  <th className="text-right">Salario Diario Integral</th>
                  <th className="text-right">Monto Garantía</th>
                  <th className="text-right">Intereses</th>
                  <th className="text-right">Retroactividad</th>
                  <th className="text-right">Monto Final</th>
                  <th>Vía Aplicada</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>
                      {r.apellido}, {r.nombre}
                      <div className="text-muted text-xs">{r.cedula}</div>
                    </td>
                    <td className="text-mono">
                      {r.anio} T{r.trimestre}
                    </td>
                    <td className="text-right text-mono">Bs. {fmt(r.salarioDiarioIntegral)}</td>
                    <td className="text-right text-mono">Bs. {fmt(r.montoGarantia)}</td>
                    <td className="text-right text-mono text-muted">Bs. {fmt(r.interesesGarantia)}</td>
                    <td className="text-right text-mono text-muted">Bs. {fmt(r.montoRetroactividad)}</td>
                    <td className="text-right text-mono font-bold">Bs. {fmt(r.montoFinal)}</td>
                    <td>
                      <span className={`badge ${r.viaAplicada === "retroactividad" ? "badge-warning" : "badge-success"}`}>
                        {r.viaAplicada === "retroactividad" ? "Vía B (Retro.)" : "Vía A (Garantía)"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Simulador Prestaciones */}
      {showCalc && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCalc(false)}>
          <div className="modal" style={{ maxWidth: "700px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Simulador Prestaciones Sociales — Doble Vía Art. 142 LOTTT</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCalc(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Trabajador</label>
                  <select className="form-select" value={selectedTrab} onChange={(e) => { setSelectedTrab(e.target.value); setCalcResult(null); }}>
                    <option value="">Seleccionar...</option>
                    {trabajadores.map((t) => <option key={t.id} value={t.id}>{t.apellido} {t.nombre} — {t.cedula}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Días Utilidades</label>
                  <input type="number" className="form-input" value={diasUtil} onChange={(e) => setDiasUtil(parseInt(e.target.value))} min="15" max="120" />
                  <div className="form-hint">Mínimo legal: 15 días (Art. 131 LOTTT)</div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={calcularSimulacion} disabled={!selectedTrab}>
                Calcular Doble Vía
              </button>

              {calcResult && (
                <div style={{ marginTop: "20px" }}>
                  <div className="divider" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px", padding: "16px" }}>
                      <div style={{ fontWeight: 700, marginBottom: "8px", color: "#065f46" }}>VÍA A — Garantía + Intereses</div>
                      <div style={{ fontSize: "13px" }}>
                        <div>Monto Garantía: <strong>Bs. {fmt(calcResult.montoGarantiaTotal)}</strong></div>
                        <div>Intereses BCV ({tasaActivaBCV}%): <strong>Bs. {fmt(calcResult.interesesTotal)}</strong></div>
                        <div style={{ borderTop: "1px solid #86efac", marginTop: "8px", paddingTop: "8px", fontWeight: 700 }}>
                          Total Vía A: Bs. {fmt(calcResult.totalViaGarantia)}
                        </div>
                      </div>
                    </div>
                    <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "6px", padding: "16px" }}>
                      <div style={{ fontWeight: 700, marginBottom: "8px", color: "#92400e" }}>VÍA B — Retroactividad</div>
                      <div style={{ fontSize: "13px" }}>
                        <div>SDI actual: <strong>Bs. {fmt(calcResult.salarioDiarioIntegralActual)}/día</strong></div>
                        <div>Días (30 × años): <strong>{calcResult.diasRetroactividad}</strong></div>
                        <div style={{ borderTop: "1px solid #fcd34d", marginTop: "8px", paddingTop: "8px", fontWeight: 700 }}>
                          Total Vía B: Bs. {fmt(calcResult.totalViaRetroactividad)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{
                    marginTop: "16px", padding: "16px", borderRadius: "6px",
                    background: calcResult.viaAplicada === "garantia" ? "#d1fae5" : "#fef3c7",
                    border: `2px solid ${calcResult.viaAplicada === "garantia" ? "#10b981" : "#f59e0b"}`,
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>
                      Se aplica {calcResult.viaAplicada === "garantia" ? "VÍA A" : "VÍA B"} (Mayor beneficio)
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 700 }}>Bs. {fmt(calcResult.montoFinal)}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                      ≈ USD {(calcResult.montoFinal / tasaBCV).toFixed(2)} (tasa BCV: {tasaBCV})
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCalc(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Liquidación */}
      {showLiq && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowLiq(false)}>
          <div className="modal" style={{ maxWidth: "700px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Cálculo de Liquidación de Egreso</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowLiq(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Trabajador</label>
                  <select className="form-select" value={selectedTrab} onChange={(e) => { setSelectedTrab(e.target.value); setLiqResult(null); }}>
                    <option value="">Seleccionar...</option>
                    {trabajadores.map((t) => <option key={t.id} value={t.id}>{t.apellido} {t.nombre} — {t.cedula}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Motivo de Egreso</label>
                  <select className="form-select" value={motivoEgreso} onChange={(e) => setMotivoEgreso(e.target.value)}>
                    <option value="renuncia">Renuncia Voluntaria</option>
                    <option value="despido">Despido Injustificado</option>
                    <option value="jubilacion">Jubilación</option>
                    <option value="mutuo_acuerdo">Mutuo Acuerdo</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Días Utilidades</label>
                  <input type="number" className="form-input" value={diasUtil} onChange={(e) => setDiasUtil(parseInt(e.target.value))} min="15" />
                </div>
              </div>
              <button className="btn btn-warning" onClick={calcularLiqSimulacion} disabled={!selectedTrab}>
                Calcular Liquidación
              </button>

              {liqResult && (
                <div style={{ marginTop: "20px" }}>
                  <div className="divider" />
                  <div style={{ fontSize: "13px" }}>
                    <div style={{ marginBottom: "12px", fontWeight: 600 }}>
                      Antigüedad: {liqResult.aniosServicio} años, {liqResult.mesesServicio} meses ({liqResult.diasServicio} días)
                    </div>
                    <div className="table-wrapper">
                      <table className="data-table">
                        <tbody>
                          <tr><td>Prestaciones Sociales (Doble Vía)</td><td className="text-right text-mono">Bs. {fmt(liqResult.prestacionesSociales.montoFinal)}</td></tr>
                          <tr><td>Vacaciones Pendientes + Bono</td><td className="text-right text-mono">Bs. {fmt(liqResult.vacaciones.montoTotal)}</td></tr>
                          <tr><td>Utilidades Proporcionales</td><td className="text-right text-mono">Bs. {fmt(liqResult.utilidadesProporcionales)}</td></tr>
                          {liqResult.preaviso > 0 && <tr><td>Preaviso (Art. 80 LOTTT)</td><td className="text-right text-mono">Bs. {fmt(liqResult.preaviso)}</td></tr>}
                          <tr style={{ fontWeight: 700, background: "#f1f5f9" }}>
                            <td>TOTAL LIQUIDACIÓN</td>
                            <td className="text-right text-mono">Bs. {fmt(liqResult.totalLiquidacion)}</td>
                          </tr>
                          <tr><td className="text-muted">Equivalente en USD (tasa BCV)</td><td className="text-right text-mono text-muted">$ {liqResult.totalLiquidacionUSD.toFixed(2)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLiq(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
