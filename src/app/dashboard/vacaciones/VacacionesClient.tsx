"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { calcularVacaciones, formatBs } from "@/lib/lottt";
import { randomUUID } from "crypto";

interface Registro {
  id: string;
  trabajadorId: string;
  nombre: string | null;
  apellido: string | null;
  cedula: string | null;
  anioServicio: number;
  diasVacaciones: number;
  diasBonoVacacional: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  salarioDiario: number;
  montoVacaciones: number;
  montoBonoVacacional: number;
  montoTotal: number;
  status: string;
  creadoEn: string;
}

interface Trabajador {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  salarioBase: number;
  fechaIngreso: string;
}

interface Props {
  registros: Registro[];
  trabajadores: Trabajador[];
  canEdit: boolean;
}

export default function VacacionesClient({ registros, trabajadores, canEdit }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [selectedTrab, setSelectedTrab] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof calcularVacaciones> | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleSelectTrab(trabId: string) {
    setSelectedTrab(trabId);
    setPreview(null);
    if (!trabId) return;
    const trab = trabajadores.find((t) => t.id === trabId);
    if (!trab) return;
    const diffDias = Math.floor((Date.now() - new Date(trab.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24));
    const anios = Math.floor(diffDias / 365);
    const salarioDiario = trab.salarioBase / 30;
    const resultado = calcularVacaciones({ aniosServicio: anios, salarioDiario });
    setPreview(resultado);
  }

  async function handleGuardar() {
    if (!selectedTrab || !preview) return;
    setSaving(true);
    setError("");
    try {
      const trab = trabajadores.find((t) => t.id === selectedTrab)!;
      const diffDias = Math.floor((Date.now() - new Date(trab.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24));
      const anios = Math.floor(diffDias / 365);

      const res = await fetch("/api/vacaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trabajadorId: selectedTrab,
          anioServicio: anios,
          diasVacaciones: preview.diasVacaciones,
          diasBonoVacacional: preview.diasBonoVacacional,
          fechaInicio: fechaInicio || null,
          salarioDiario: trab.salarioBase / 30,
          montoVacaciones: preview.montoVacaciones,
          montoBonoVacacional: preview.montoBonoVacacional,
          montoTotal: preview.montoTotal,
        }),
      });
      if (!res.ok) { setError("Error al guardar"); return; }
      setShowModal(false);
      router.refresh();
    } catch { setError("Error de conexión"); }
    finally { setSaving(false); }
  }

  const fmt = formatBs;
  const totalAcumulado = registros.reduce((a, r) => a + r.montoTotal, 0);

  return (
    <>
      <div className="alert alert-info" style={{ marginBottom: "16px" }}>
        <strong>Vacaciones LOTTT:</strong> 15 días de descanso + 1 día adicional por cada año de servicio (Art. 190).
        Bono Vacacional: 15 días + 1 por año adicional (Art. 192). Calculado sobre salario normal.
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", marginBottom: "20px" }}>
        <div className="stat-card">
          <div className="stat-label">Registros de Vacaciones</div>
          <div className="stat-value">{registros.length}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Monto Total Acumulado</div>
          <div className="stat-value" style={{ fontSize: "16px" }}>Bs. {fmt(totalAcumulado)}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Pendientes de Aprobar</div>
          <div className="stat-value">{registros.filter((r) => r.status === "pendiente").length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Libro de Vacaciones</h2>
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={() => { setShowModal(true); setSelectedTrab(""); setPreview(null); setError(""); }}>
              + Registrar Vacaciones
            </button>
          )}
        </div>

        {registros.length === 0 ? (
          <p className="text-muted" style={{ textAlign: "center", padding: "32px" }}>No hay registros de vacaciones.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th>Año Servicio</th>
                  <th>Días Vac.</th>
                  <th>Días Bono</th>
                  <th>Período</th>
                  <th className="text-right">Monto Vac.</th>
                  <th className="text-right">Bono Vac.</th>
                  <th className="text-right">Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>
                      {r.apellido}, {r.nombre}
                      <div className="text-muted text-xs">{r.cedula}</div>
                    </td>
                    <td className="text-mono">{r.anioServicio}° año</td>
                    <td className="text-mono">{r.diasVacaciones}</td>
                    <td className="text-mono">{r.diasBonoVacacional}</td>
                    <td className="text-muted text-sm">
                      {r.fechaInicio ? `${r.fechaInicio}${r.fechaFin ? ` → ${r.fechaFin}` : ""}` : "—"}
                    </td>
                    <td className="text-right text-mono">Bs. {fmt(r.montoVacaciones)}</td>
                    <td className="text-right text-mono">Bs. {fmt(r.montoBonoVacacional)}</td>
                    <td className="text-right text-mono font-bold">Bs. {fmt(r.montoTotal)}</td>
                    <td>
                      <span className={`badge ${
                        r.status === "pagadas" ? "badge-success" :
                        r.status === "aprobadas" ? "badge-primary" :
                        r.status === "disfrutadas" ? "badge-info" : "badge-warning"
                      }`}>{r.status}</span>
                    </td>
                  </tr>
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
              <h3 className="modal-title">Calcular y Registrar Vacaciones</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Trabajador <span className="required">*</span></label>
                  <select className="form-select" value={selectedTrab} onChange={(e) => handleSelectTrab(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {trabajadores.map((t) => <option key={t.id} value={t.id}>{t.apellido} {t.nombre} — {t.cedula}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha Inicio Vacaciones</label>
                  <input type="date" className="form-input" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                </div>
              </div>

              {preview && (
                <div style={{ marginTop: "16px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px", padding: "16px" }}>
                  <div style={{ fontWeight: 700, marginBottom: "10px" }}>Cálculo según Art. 190-192 LOTTT</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                    <div><span className="text-muted">Días de Vacaciones:</span> <strong>{preview.diasVacaciones}</strong></div>
                    <div><span className="text-muted">Días Bono Vacacional:</span> <strong>{preview.diasBonoVacacional}</strong></div>
                    <div><span className="text-muted">Monto Vacaciones:</span> <strong>Bs. {fmt(preview.montoVacaciones)}</strong></div>
                    <div><span className="text-muted">Bono Vacacional:</span> <strong>Bs. {fmt(preview.montoBonoVacacional)}</strong></div>
                  </div>
                  <div style={{ marginTop: "10px", fontSize: "16px", fontWeight: 700, textAlign: "center", color: "#065f46" }}>
                    TOTAL: Bs. {fmt(preview.montoTotal)}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardar} disabled={saving || !preview}>
                {saving ? "Guardando..." : "Registrar Vacaciones"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
