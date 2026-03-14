"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface TasaData {
  valor: number;
  fechaVigencia: string;
  fuente: string;
}

interface TasaHistorial {
  id: string;
  tipo: string;
  valor: number;
  fechaVigencia: string;
  fuente: string | null;
  creadoEn: string;
}

interface Props {
  tasaBCV: TasaData | null;
  tasaActiva: TasaData | null;
  historialBCV: TasaHistorial[];
  historialActiva: TasaHistorial[];
  canUpdate: boolean;
}

export default function TasasClient({ tasaBCV, tasaActiva, historialBCV, historialActiva, canUpdate }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingManual, setLoadingManual] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<"bcv" | "activa">("bcv");
  const [manualValor, setManualValor] = useState("");
  const [manualTipo, setManualTipo] = useState("bcv_usd_ves");

  async function handleActualizarBCV() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/tasas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "actualizar_bcv" }),
      });
      const data = await res.json() as { actualizada?: boolean; valor?: number; error?: string };
      if (!res.ok) { setError(data.error || "Error"); return; }
      if (data.actualizada) {
        setSuccess(`Tasa actualizada: Bs. ${data.valor?.toFixed(2)}`);
        router.refresh();
      } else {
        setSuccess(`Tasa ya actualizada hoy: Bs. ${data.valor?.toFixed(2)}`);
      }
    } catch { setError("Error de conexión"); }
    finally { setLoading(false); }
  }

  async function handleManual() {
    if (!manualValor || parseFloat(manualValor) <= 0) { setError("Valor inválido"); return; }
    setLoadingManual(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/tasas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: manualTipo, valor: parseFloat(manualValor) }),
      });
      if (!res.ok) { setError("Error al guardar"); return; }
      setSuccess("Tasa registrada manualmente.");
      setManualValor("");
      router.refresh();
    } finally { setLoadingManual(false); }
  }

  const historial = tab === "bcv" ? historialBCV : historialActiva;

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        <div className="stat-card">
          <div className="stat-label">Tasa BCV USD/VES</div>
          <div className="stat-value">{tasaBCV ? `Bs. ${tasaBCV.valor.toFixed(2)}` : "Sin datos"}</div>
          <div className="stat-sub">{tasaBCV ? new Date(tasaBCV.fechaVigencia).toLocaleDateString("es-VE") : ""} • {tasaBCV?.fuente || ""}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Tasa Activa BCV (Prestaciones)</div>
          <div className="stat-value">{tasaActiva ? `${tasaActiva.valor}%` : "Sin datos"}</div>
          <div className="stat-sub">Para intereses Art. 142 LOTTT</div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {canUpdate && (
        <div className="card" style={{ marginBottom: "20px" }}>
          <div className="card-header">
            <h2 className="card-title">Actualización de Tasas</h2>
          </div>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px" }}>Actualización Automática</div>
              <button className="btn btn-primary" onClick={handleActualizarBCV} disabled={loading}>
                {loading ? "Consultando API BCV..." : "Actualizar Tasa BCV desde API"}
              </button>
              <div className="form-hint" style={{ marginTop: "6px" }}>
                Consulta la API pública del BCV. Si no está disponible, usa fuente alternativa.
              </div>
            </div>
            <div style={{ borderLeft: "1px solid var(--color-border)", paddingLeft: "20px", flexGrow: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px" }}>Registro Manual</div>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Tipo</label>
                  <select className="form-select" style={{ width: "200px" }} value={manualTipo} onChange={(e) => setManualTipo(e.target.value)}>
                    <option value="bcv_usd_ves">BCV USD/VES</option>
                    <option value="tasa_activa_bcv">Tasa Activa BCV (%)</option>
                    <option value="tasa_pasiva_bcv">Tasa Pasiva BCV (%)</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Valor</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: "140px" }}
                    value={manualValor}
                    onChange={(e) => setManualValor(e.target.value)}
                    placeholder="Ej: 36.50"
                    step="0.01"
                    min="0"
                  />
                </div>
                <button className="btn btn-secondary" onClick={handleManual} disabled={loadingManual}>
                  Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Log de Auditoría — Historial de Tasas</h2>
        </div>
        <div className="tabs">
          <button className={`tab-btn ${tab === "bcv" ? "active" : ""}`} onClick={() => setTab("bcv")}>
            Tasa BCV USD/VES
          </button>
          <button className={`tab-btn ${tab === "activa" ? "active" : ""}`} onClick={() => setTab("activa")}>
            Tasa Activa BCV
          </button>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha Vigencia</th>
                <th className="text-right">Valor</th>
                <th>Fuente</th>
                <th>Registrado</th>
              </tr>
            </thead>
            <tbody>
              {historial.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: "24px", color: "var(--color-text-muted)" }}>Sin registros</td></tr>
              ) : historial.map((t) => (
                <tr key={t.id}>
                  <td className="text-mono">{new Date(t.fechaVigencia).toLocaleDateString("es-VE")}</td>
                  <td className="text-right text-mono font-bold">
                    {tab === "bcv" ? `Bs. ${t.valor.toFixed(2)}` : `${t.valor}%`}
                  </td>
                  <td>
                    <span className={`badge ${t.fuente === "manual" ? "badge-warning" : t.fuente === "api_bcv" ? "badge-success" : "badge-info"}`}>
                      {t.fuente || "—"}
                    </span>
                  </td>
                  <td className="text-muted text-sm">{new Date(t.creadoEn).toLocaleDateString("es-VE")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
