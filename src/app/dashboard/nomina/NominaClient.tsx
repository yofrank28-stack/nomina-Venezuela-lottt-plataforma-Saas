"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Periodo {
  id: string;
  tipo: string;
  anio: number;
  mes: number;
  quincena: number | null;
  fechaInicio: string;
  fechaFin: string;
  status: string;
  totalNeto: number;
  cantidadRecibos: number;
  creadoEn: string;
}

interface Props {
  periodos: Periodo[];
  tasaBCV: number;
  canEdit: boolean;
  empresaId: string;
}

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export default function NominaClient({ periodos, tasaBCV, canEdit, empresaId }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    tipo: "mensual",
    anio: currentYear,
    mes: currentMonth,
    quincena: 1,
    fechaInicio: "",
    fechaFin: "",
  });
  const [calcPeriodoId, setCalcPeriodoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPeriodo, setSelectedPeriodo] = useState<string | null>(null);
  const [recibos, setRecibos] = useState<Array<{ id: string; nombre: string | null; apellido: string | null; cedula: string | null; salarioBase: number; totalAsignaciones: number; totalDeducciones: number; salarioNeto: number; salarioNetoUsd: number | null; status: string }>>([]);
  const [loadingRecibos, setLoadingRecibos] = useState(false);

  async function handleCrearPeriodo() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/nomina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "crear_periodo", ...form }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error || "Error"); return; }
      setShowModal(false);
      router.refresh();
    } catch { setError("Error de conexión"); }
    finally { setLoading(false); }
  }

  async function handleCalcular(periodoId: string) {
    if (!confirm("¿Calcular nómina para todos los trabajadores activos?")) return;
    setCalcPeriodoId(periodoId);
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/nomina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "calcular_periodo", periodoId }),
      });
      const data = await res.json() as { error?: string; recibosGenerados?: number };
      if (!res.ok) { setError(data.error || "Error"); return; }
      alert(`Nómina calculada: ${data.recibosGenerados} recibos generados.`);
      router.refresh();
    } catch { setError("Error de conexión"); }
    finally { setLoading(false); setCalcPeriodoId(null); }
  }

  async function handleAprobar(periodoId: string) {
    if (!confirm("¿Aprobar este período de nómina?")) return;
    setLoading(true);
    try {
      await fetch("/api/nomina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "aprobar_periodo", periodoId }),
      });
      router.refresh();
    } finally { setLoading(false); }
  }

  async function loadRecibos(periodoId: string) {
    if (selectedPeriodo === periodoId) { setSelectedPeriodo(null); setRecibos([]); return; }
    setLoadingRecibos(true);
    setSelectedPeriodo(periodoId);
    try {
      const res = await fetch(`/api/nomina?tipo=recibos&periodo_id=${periodoId}`);
      const data = await res.json() as { recibos?: typeof recibos };
      setRecibos(data.recibos || []);
    } finally { setLoadingRecibos(false); }
  }

  const fmt = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Períodos de Nómina</h2>
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
              + Nuevo Período
            </button>
          )}
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {periodos.length === 0 ? (
          <p className="text-muted" style={{ textAlign: "center", padding: "32px" }}>
            No hay períodos de nómina. Cree el primero para comenzar.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Tipo</th>
                  <th>Fechas</th>
                  <th className="text-right">Total Neto (Bs.)</th>
                  <th className="text-right">Aprox. USD</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {periodos.map((p) => (
                  <>
                    <tr key={p.id}>
                      <td className="text-mono font-semibold">
                        {MESES[p.mes]} {p.anio}
                        {p.quincena ? ` - Q${p.quincena}` : ""}
                      </td>
                      <td style={{ textTransform: "capitalize" }}>{p.tipo}</td>
                      <td className="text-muted text-sm">
                        {p.fechaInicio} – {p.fechaFin}
                      </td>
                      <td className="text-right text-mono">
                        {p.totalNeto > 0 ? `Bs. ${fmt(p.totalNeto)}` : "—"}
                      </td>
                      <td className="text-right text-mono text-muted">
                        {p.totalNeto > 0 ? `$ ${fmt(p.totalNeto / tasaBCV)}` : "—"}
                      </td>
                      <td>
                        <span className={`badge ${
                          p.status === "pagada" ? "badge-success" :
                          p.status === "aprobada" ? "badge-primary" :
                          p.status === "calculada" ? "badge-info" : "badge-neutral"
                        }`}>{p.status}</span>
                        {p.cantidadRecibos > 0 && (
                          <span className="text-muted text-sm" style={{ marginLeft: "6px" }}>
                            ({p.cantidadRecibos} recibos)
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {canEdit && p.status === "borrador" && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleCalcular(p.id)}
                              disabled={loading && calcPeriodoId === p.id}
                            >
                              {loading && calcPeriodoId === p.id ? "Calculando..." : "Calcular"}
                            </button>
                          )}
                          {canEdit && p.status === "calculada" && (
                            <button className="btn btn-success btn-sm" onClick={() => handleAprobar(p.id)}>
                              Aprobar
                            </button>
                          )}
                          {p.cantidadRecibos > 0 && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => loadRecibos(p.id)}
                            >
                              {selectedPeriodo === p.id ? "Ocultar" : "Ver Recibos"}
                            </button>
                          )}
                          {(p.status === "calculada" || p.status === "aprobada" || p.status === "pagada") && (
                            <a
                              href={`/api/reportes?tipo=libro_salarios&periodo_id=${p.id}`}
                              className="btn btn-secondary btn-sm"
                              target="_blank"
                            >
                              .TXT
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>

                    {selectedPeriodo === p.id && (
                      <tr key={`${p.id}-recibos`}>
                        <td colSpan={7} style={{ padding: "0", background: "#f8fafc", borderBottom: "2px solid var(--color-border)" }}>
                          {loadingRecibos ? (
                            <div style={{ padding: "16px", textAlign: "center", color: "var(--color-text-muted)" }}>Cargando recibos...</div>
                          ) : (
                            <table className="data-table" style={{ margin: 0, border: "none" }}>
                              <thead>
                                <tr>
                                  <th style={{ paddingLeft: "32px" }}>Trabajador</th>
                                  <th className="text-right">Asignaciones</th>
                                  <th className="text-right">Deducciones</th>
                                  <th className="text-right">Neto (Bs.)</th>
                                  <th className="text-right">Neto (USD)</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {recibos.map((r) => (
                                  <tr key={r.id}>
                                    <td style={{ paddingLeft: "32px" }}>
                                      {r.apellido}, {r.nombre}
                                      <span className="text-muted text-sm" style={{ marginLeft: "6px" }}>{r.cedula}</span>
                                    </td>
                                    <td className="text-right text-mono">Bs. {fmt(r.totalAsignaciones)}</td>
                                    <td className="text-right text-mono text-danger">Bs. {fmt(r.totalDeducciones)}</td>
                                    <td className="text-right text-mono font-bold">Bs. {fmt(r.salarioNeto)}</td>
                                    <td className="text-right text-mono text-muted">$ {(r.salarioNetoUsd || 0).toFixed(2)}</td>
                                    <td>
                                      <a
                                        href={`/api/reportes?tipo=recibo&recibo_id=${r.id}`}
                                        className="btn btn-secondary btn-sm"
                                        target="_blank"
                                      >
                                        Ver Recibo
                                      </a>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr style={{ background: "#f1f5f9", fontWeight: 700 }}>
                                  <td style={{ paddingLeft: "32px" }}>TOTALES ({recibos.length} trabajadores)</td>
                                  <td className="text-right text-mono">Bs. {fmt(recibos.reduce((a, r) => a + r.totalAsignaciones, 0))}</td>
                                  <td className="text-right text-mono">Bs. {fmt(recibos.reduce((a, r) => a + r.totalDeducciones, 0))}</td>
                                  <td className="text-right text-mono">Bs. {fmt(recibos.reduce((a, r) => a + r.salarioNeto, 0))}</td>
                                  <td className="text-right text-mono">$ {fmt(recibos.reduce((a, r) => a + (r.salarioNetoUsd || 0), 0))}</td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Nuevo Período de Nómina</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Tipo de Período</label>
                  <select className="form-select" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    <option value="mensual">Mensual</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="semanal">Semanal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Año</label>
                  <input type="number" className="form-input" value={form.anio}
                    onChange={(e) => setForm({ ...form, anio: parseInt(e.target.value) })} min="2020" max="2030" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mes</label>
                  <select className="form-select" value={form.mes} onChange={(e) => setForm({ ...form, mes: parseInt(e.target.value) })}>
                    {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                {form.tipo === "quincenal" && (
                  <div className="form-group">
                    <label className="form-label">Quincena</label>
                    <select className="form-select" value={form.quincena} onChange={(e) => setForm({ ...form, quincena: parseInt(e.target.value) })}>
                      <option value={1}>Primera (1-15)</option>
                      <option value={2}>Segunda (16-fin)</option>
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Fecha Inicio</label>
                  <input type="date" className="form-input" value={form.fechaInicio}
                    onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha Fin</label>
                  <input type="date" className="form-input" value={form.fechaFin}
                    onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
                </div>
              </div>
              <div className="alert alert-info">
                Al calcular, el sistema procesará la nómina de todos los trabajadores activos usando la tasa BCV vigente
                (Bs. {tasaBCV.toFixed(2)}) y calculará automáticamente IVSS, RPE, LPH y Contribución Especial de Pensiones (9% CEPP).
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCrearPeriodo} disabled={loading}>
                {loading ? "Creando..." : "Crear Período"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
