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
    </>
  );
}
