"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Empresa {
  id: string;
  rif: string;
  razonSocial: string;
  nombreComercial: string | null;
  email: string | null;
  licenciaStatus: string;
  licenciaExpira: string | null;
  planLicencia: string;
  onboardingCompleto: boolean;
  creadoEn: string;
  activo: boolean;
  numUsuarios: number;
}

interface Props { empresas: Empresa[]; }

export default function MasterEmpresasClient({ empresas }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showActivarModal, setShowActivarModal] = useState<string | null>(null);
  const [activarMeses, setActivarMeses] = useState(1);
  const [activarPlan, setActivarPlan] = useState("basico");
  const [activando, setActivando] = useState(false);
  const [activarMsg, setActivarMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState({
    rif: "", razonSocial: "", nombreComercial: "", email: "",
    adminEmail: "", adminNombre: "", adminApellido: "", adminPassword: "",
    planLicencia: "basico",
  });

  async function handleCrear() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "crear_empresa", ...form }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error || "Error"); return; }
      setShowModal(false);
      router.refresh();
    } catch { setError("Error de conexión"); }
    finally { setSaving(false); }
  }

  async function handleToggle(empresaId: string, status: string) {
    const accion = status === "suspendida" ? "activar" : "suspender";
    if (!confirm(`¿${accion === "suspender" ? "Suspender" : "Activar"} esta empresa?`)) return;
    await fetch("/api/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, empresaId }),
    });
    router.refresh();
  }

  async function handleActivarLicencia() {
    if (!showActivarModal) return;
    setActivando(true);
    setActivarMsg("");
    try {
      const res = await fetch("/api/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          accion: "activar_licencia", 
          empresaId: showActivarModal,
          meses: activarMeses,
          plan: activarPlan,
        }),
      });
      const data = await res.json() as { success?: boolean; message?: string; error?: string };
      if (!res.ok || !data.success) {
        setActivarMsg(data.error || "Error al activar licencia");
        return;
      }
      setActivarMsg(data.message || "Licencia activada exitosamente");
      setTimeout(() => {
        setShowActivarModal(null);
        setActivarMsg("");
        router.refresh();
      }, 2000);
    } catch {
      setActivarMsg("Error de conexión");
    } finally {
      setActivando(false);
    }
  }

  async function handleBackup(empresaId: string, empresaNombre: string) {
    if (!confirm(`¿Exportar respaldo completo de "${empresaNombre}"?`)) return;
    
    try {
      const res = await fetch(`/api/backup?empresaId=${empresaId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!res.ok) {
        alert("Error al generar respaldo");
        return;
      }
      
      const data = await res.json();
      
      // Create JSON file
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fecha = new Date().toISOString().split("T")[0];
      a.download = `backup_${empresaNombre.replace(/[^a-zA-Z0-9]/g, "_")}_${fecha}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      alert(`Respaldo de "${empresaNombre}" descargado exitosamente`);
    } catch {
      alert("Error al generar respaldo");
    }
  }

  const filtered = empresas.filter((e) =>
    !filtro || `${e.rif} ${e.razonSocial}`.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Empresas Clientes</h2>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowModal(true); setError(""); }}>+ Nueva Empresa</button>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <input type="search" className="form-input" style={{ maxWidth: "300px" }} placeholder="Buscar por RIF o nombre..."
            value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>RIF</th>
                <th>Razón Social</th>
                <th>Plan</th>
                <th>Licencia</th>
                <th>Vence</th>
                <th>Usuarios</th>
                <th>Onboarding</th>
                <th>Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td className="text-mono">{e.rif}</td>
                  <td style={{ fontWeight: 500 }}>
                    {e.razonSocial}
                    {e.email && <div className="text-muted text-xs">{e.email}</div>}
                  </td>
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
                  <td className="text-mono">{e.numUsuarios}</td>
                  <td>
                    <span className={`badge ${e.onboardingCompleto ? "badge-success" : "badge-neutral"}`}>
                      {e.onboardingCompleto ? "Completo" : "Pendiente"}
                    </span>
                  </td>
                  <td className="text-muted text-sm">{new Date(e.creadoEn).toLocaleDateString("es-VE")}</td>
                  <td>
                    <button
                      className="btn btn-sm"
                      style={{ backgroundColor: "#0047AB", color: "#fff", border: "none", marginRight: "4px" }}
                      onClick={() => { setShowActivarModal(e.id); setActivarMsg(""); }}
                    >
                      Activar Licencia
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ backgroundColor: "#059669", color: "#fff", border: "none", marginRight: "4px" }}
                      onClick={() => handleBackup(e.id, e.razonSocial)}
                    >
                      Respaldo
                    </button>
                    <button
                      className={`btn btn-sm ${e.licenciaStatus === "suspendida" ? "btn-success" : "btn-danger"}`}
                      onClick={() => handleToggle(e.id, e.licenciaStatus)}
                    >
                      {e.licenciaStatus === "suspendida" ? "Activar" : "Suspender"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: "640px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Registrar Nueva Empresa</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <div style={{ fontWeight: 600, fontSize: "12px", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "10px" }}>Datos de la Empresa</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">RIF <span className="required">*</span></label>
                  <input className="form-input" value={form.rif} onChange={(e) => setForm({ ...form, rif: e.target.value })} placeholder="J-12345678-9" />
                </div>
                <div className="form-group">
                  <label className="form-label">Razón Social <span className="required">*</span></label>
                  <input className="form-input" value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Empresa</label>
                  <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Plan de Licencia</label>
                  <select className="form-select" value={form.planLicencia} onChange={(e) => setForm({ ...form, planLicencia: e.target.value })}>
                    <option value="basico">Básico — USD 15/mes</option>
                    <option value="profesional">Profesional — USD 35/mes</option>
                    <option value="empresarial">Empresarial — USD 80/mes</option>
                  </select>
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: "12px", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "10px", marginTop: "16px" }}>Usuario Administrador</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Nombre <span className="required">*</span></label>
                  <input className="form-input" value={form.adminNombre} onChange={(e) => setForm({ ...form, adminNombre: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido <span className="required">*</span></label>
                  <input className="form-input" value={form.adminApellido} onChange={(e) => setForm({ ...form, adminApellido: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email <span className="required">*</span></label>
                  <input type="email" className="form-input" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña Inicial <span className="required">*</span></label>
                  <input type="password" className="form-input" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCrear} disabled={saving}>
                {saving ? "Registrando..." : "Crear Empresa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Activar Licencia */}
      {showActivarModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !activando && setShowActivarModal(null)}>
          <div className="modal" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Activar Licencia — 30 Días</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => !activando && setShowActivarModal(null)} disabled={activando}>✕</button>
            </div>
            <div className="modal-body">
              {activarMsg && (
                <div className={`alert ${activarMsg.includes("Error") || activarMsg.includes("Error") ? "alert-danger" : "alert-success"}`}>
                  {activarMsg}
                </div>
              )}
              
              <div className="alert alert-info" style={{ marginBottom: "16px" }}>
                <strong>Nota:</strong> Al activar, se enviará un correo de bienvenida con el manual PDF al administrador de la empresa.
              </div>

              <div className="form-group">
                <label className="form-label">Período de Licencia</label>
                <select 
                  className="form-select" 
                  value={activarMeses} 
                  onChange={(e) => setActivarMeses(Number(e.target.value))}
                  disabled={activando}
                >
                  <option value={1}>30 días (1 mes)</option>
                  <option value={3}>90 días (3 meses)</option>
                  <option value={6}>180 días (6 meses)</option>
                  <option value={12}>365 días (1 año)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Plan</label>
                <select 
                  className="form-select" 
                  value={activarPlan} 
                  onChange={(e) => setActivarPlan(e.target.value)}
                  disabled={activando}
                >
                  <option value="basico">Básico — USD 15/mes</option>
                  <option value="profesional">Profesional — USD 35/mes</option>
                  <option value="empresarial">Empresarial — USD 80/mes</option>
                </select>
              </div>

              <div style={{ 
                marginTop: "16px", 
                padding: "12px", 
                background: "var(--color-bg-elevated)", 
                borderRadius: "6px",
                border: "1px solid var(--color-border)"
              }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  La licencia se extenderá desde hoy por {activarMeses} mes(es).
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowActivarModal(null)} disabled={activando}>
                Cancelar
              </button>
              <button 
                className="btn" 
                style={{ backgroundColor: "#0047AB", color: "#fff", border: "none" }}
                onClick={handleActivarLicencia}
                disabled={activando}
              >
                {activando ? "Activando..." : "Activar y Enviar Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
