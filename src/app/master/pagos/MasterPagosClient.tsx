"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Pago {
  id: string;
  empresaId: string;
  metodoPago: string;
  referencia: string;
  monto: number;
  moneda: string;
  fechaPago: string;
  planSolicitado: string;
  mesesSolicitados: number;
  status: string;
  notas: string | null;
  comprobante: string | null;
  creadoEn: string;
  razonSocial: string | null;
  rif: string | null;
  licenciaStatus: string | null;
}

interface Props { pagos: Pago[]; }

const METODO_LABELS: Record<string, string> = {
  binance: "Binance Pay",
  zinli: "Zinli",
  pago_movil: "Pago Móvil",
  banesco_panama: "Banesco Panamá",
};

export default function MasterPagosClient({ pagos }: Props) {
  const router = useRouter();
  const [filtroStatus, setFiltroStatus] = useState("pendiente");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [procesando, setProcesando] = useState<string | null>(null);
  const [notasRec, setNotasRec] = useState("");
  const [showReject, setShowReject] = useState<string | null>(null);

  async function handleAction(pagoId: string, accion: "verificar" | "rechazar", notas?: string) {
    setProcesando(pagoId);
    try {
      const res = await fetch("/api/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagoId, accion, notas }),
      });
      if (res.ok) {
        router.refresh();
        setShowReject(null);
        setNotasRec("");
      }
    } finally { setProcesando(null); }
  }

  const filtered = pagos.filter((p) => {
    const statusMatch = !filtroStatus || p.status === filtroStatus;
    const metodoMatch = !filtroMetodo || p.metodoPago === filtroMetodo;
    return statusMatch && metodoMatch;
  });

  return (
    <>
      <div className="alert alert-info">
        <strong>Panel de Validación de Pagos.</strong> Verifique cada referencia de pago en la plataforma correspondiente antes de aprobar.
        Al verificar, la licencia de la empresa se activa automáticamente por el período pagado.
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Comprobantes de Pago</h2>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {["pendiente", "verificado", "rechazado"].map((s) => (
            <button
              key={s}
              className={`btn ${filtroStatus === s ? "btn-primary" : "btn-secondary"} btn-sm`}
              onClick={() => setFiltroStatus(s)}
              style={{ textTransform: "capitalize" }}
            >
              {s} ({pagos.filter((p) => p.status === s).length})
            </button>
          ))}
          <button className={`btn ${filtroStatus === "" ? "btn-primary" : "btn-secondary"} btn-sm`}
            onClick={() => setFiltroStatus("")}>Todos</button>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)", alignSelf: "center" }}>Método:</span>
          <button
            className={`btn btn-sm ${filtroMetodo === "" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFiltroMetodo("")}
          >
            Todos
          </button>
          <button
            className={`btn btn-sm ${filtroMetodo === "binance" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFiltroMetodo("binance")}
          >
            Binance ({pagos.filter(p => p.metodoPago === "binance").length})
          </button>
          <button
            className={`btn btn-sm ${filtroMetodo === "pago_movil" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFiltroMetodo("pago_movil")}
          >
            Pago Móvil ({pagos.filter(p => p.metodoPago === "pago_movil").length})
          </button>
          <button
            className={`btn btn-sm ${filtroMetodo === "zinli" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFiltroMetodo("zinli")}
          >
            Zinli ({pagos.filter(p => p.metodoPago === "zinli").length})
          </button>
          <button
            className={`btn btn-sm ${filtroMetodo === "banesco_panama" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFiltroMetodo("banesco_panama")}
          >
            Banesco PA ({pagos.filter(p => p.metodoPago === "banesco_panama").length})
          </button>
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
                <th>Estado</th>
                {filtroStatus === "pendiente" && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--color-text-muted)" }}>No hay pagos en este estado</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.razonSocial}</div>
                    <div className="text-muted text-xs">{p.rif}</div>
                    <div>
                      <span className={`badge ${p.licenciaStatus === "activa" ? "badge-success" : p.licenciaStatus === "trial" ? "badge-info" : "badge-warning"}`} style={{ fontSize: "10px" }}>
                        Lic: {p.licenciaStatus}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-primary">{METODO_LABELS[p.metodoPago] || p.metodoPago}</span>
                  </td>
                  <td className="text-mono" style={{ fontSize: "12px", maxWidth: "200px", wordBreak: "break-all" }}>
                    {p.referencia}
                    {p.notas && <div className="text-muted text-xs" style={{ marginTop: "2px" }}>{p.notas}</div>}
                  </td>
                  <td className="text-right text-mono font-bold">{p.monto} {p.moneda}</td>
                  <td>
                    <div style={{ textTransform: "capitalize" }}>{p.planSolicitado}</div>
                    <div className="text-muted text-xs">{p.mesesSolicitados} mes(es)</div>
                  </td>
                  <td className="text-muted text-sm">
                    {p.fechaPago}
                    <div className="text-xs">{new Date(p.creadoEn).toLocaleDateString("es-VE")}</div>
                  </td>
                  <td>
                    <span className={`badge ${p.status === "verificado" ? "badge-success" : p.status === "rechazado" ? "badge-danger" : "badge-warning"}`}>
                      {p.status}
                    </span>
                  </td>
                  {filtroStatus === "pendiente" && (
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleAction(p.id, "verificar")}
                          disabled={procesando === p.id}
                        >
                          {procesando === p.id ? "..." : "Verificar ✓"}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setShowReject(p.id)}
                        >
                          Rechazar ✕
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject modal */}
      {showReject && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Rechazar Pago</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Motivo del rechazo</label>
                <textarea className="form-textarea" rows={3} value={notasRec} onChange={(e) => setNotasRec(e.target.value)} placeholder="Ej: Referencia no encontrada, monto incorrecto..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowReject(null); setNotasRec(""); }}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleAction(showReject, "rechazar", notasRec)}>
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
