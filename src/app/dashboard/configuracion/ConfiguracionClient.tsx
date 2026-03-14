"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Empresa {
  id: string;
  rif: string;
  razonSocial: string;
  nombreComercial: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  ivssPatronal: number;
  ivssObrero: number;
  rpePatronal: number;
  rpeObrero: number;
  lphPatronal: number;
  lphObrero: number;
  diasUtilidades: number;
  periodicidadNomina: string;
  licenciaStatus: string;
  licenciaExpira: string | null;
  planLicencia: string;
  onboardingCompleto: boolean;
  onboardingPaso: number;
}

interface CentroCosto { id: string; codigo: string; nombre: string; activo: boolean; }
interface Cargo { id: string; nombre: string; nivel: string | null; activo: boolean; }
interface Pago {
  id: string;
  metodoPago: string;
  referencia: string;
  monto: number;
  moneda: string;
  fechaPago: string;
  planSolicitado: string;
  mesesSolicitados: number;
  status: string;
  creadoEn: string;
}

interface Props {
  empresa: Empresa;
  centrosCosto: CentroCosto[];
  cargos: Cargo[];
  pagos: Pago[];
}

const PLANES = [
  { id: "basico", nombre: "Básico", precio: "USD 15/mes", descripcion: "Hasta 25 trabajadores" },
  { id: "profesional", nombre: "Profesional", precio: "USD 35/mes", descripcion: "Hasta 100 trabajadores + reportes avanzados" },
  { id: "empresarial", nombre: "Empresarial", precio: "USD 80/mes", descripcion: "Trabajadores ilimitados + multi-usuario" },
];

const METODOS_PAGO = [
  { id: "binance", nombre: "Binance Pay (USDT)" },
  { id: "zinli", nombre: "Zinli (USD)" },
  { id: "pago_movil", nombre: "Pago Móvil (VES)" },
  { id: "banesco_panama", nombre: "Banesco Panamá (USD)" },
];

export default function ConfiguracionClient({ empresa: initial, centrosCosto: initialCC, cargos: initialCargos, pagos }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("empresa");
  const [form, setForm] = useState({
    rif: initial.rif,
    razonSocial: initial.razonSocial,
    nombreComercial: initial.nombreComercial || "",
    direccion: initial.direccion || "",
    telefono: initial.telefono || "",
    email: initial.email || "",
    ivssPatronal: initial.ivssPatronal,
    ivssObrero: initial.ivssObrero,
    rpePatronal: initial.rpePatronal,
    rpeObrero: initial.rpeObrero,
    lphPatronal: initial.lphPatronal,
    lphObrero: initial.lphObrero,
    diasUtilidades: initial.diasUtilidades,
    periodicidadNomina: initial.periodicidadNomina,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Centros costo
  const [centrosCosto, setCentrosCosto] = useState(initialCC);
  const [nuevoCentro, setNuevoCentro] = useState({ codigo: "", nombre: "" });

  // Cargos
  const [cargos, setCargos] = useState(initialCargos);
  const [nuevoCargo, setNuevoCargo] = useState({ nombre: "", nivel: "" });

  // Pago licencia
  const [pagoForm, setPagoForm] = useState({
    metodoPago: "binance",
    referencia: "",
    monto: "",
    moneda: "USDT",
    fechaPago: new Date().toISOString().split("T")[0],
    planSolicitado: initial.planLicencia,
    mesesSolicitados: "1",
    notas: "",
  });
  const [savingPago, setSavingPago] = useState(false);

  async function handleSaveEmpresa() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/empresas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { setError("Error al guardar"); return; }
      setSuccess("Configuración guardada correctamente.");
      router.refresh();
    } catch { setError("Error de conexión"); }
    finally { setSaving(false); }
  }

  async function handleAddCentro() {
    if (!nuevoCentro.codigo || !nuevoCentro.nombre) { setError("Complete código y nombre"); return; }
    const res = await fetch("/api/empresas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "agregar_centro_costo", ...nuevoCentro }),
    });
    const data = await res.json() as { id?: string };
    if (data.id) {
      setCentrosCosto([...centrosCosto, { id: data.id, ...nuevoCentro, activo: true }]);
      setNuevoCentro({ codigo: "", nombre: "" });
    }
  }

  async function handleAddCargo() {
    if (!nuevoCargo.nombre) { setError("Complete nombre del cargo"); return; }
    const res = await fetch("/api/empresas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "agregar_cargo", ...nuevoCargo }),
    });
    const data = await res.json() as { id?: string };
    if (data.id) {
      setCargos([...cargos, { id: data.id, ...nuevoCargo, activo: true }]);
      setNuevoCargo({ nombre: "", nivel: "" });
    }
  }

  async function handleSendPago() {
    setSavingPago(true);
    setError("");
    try {
      const res = await fetch("/api/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pagoForm, monto: parseFloat(pagoForm.monto), mesesSolicitados: parseInt(pagoForm.mesesSolicitados) }),
      });
      if (!res.ok) { setError("Error al enviar pago"); return; }
      setSuccess("Pago enviado para verificación. El Master validará el comprobante.");
      setPagoForm({ ...pagoForm, referencia: "", monto: "", notas: "" });
      router.refresh();
    } finally { setSavingPago(false); }
  }

  return (
    <>
      <div className="tabs">
        <button className={`tab-btn ${tab === "empresa" ? "active" : ""}`} onClick={() => setTab("empresa")}>Datos Empresa</button>
        <button className={`tab-btn ${tab === "nomina" ? "active" : ""}`} onClick={() => setTab("nomina")}>Parámetros Nómina</button>
        <button className={`tab-btn ${tab === "centros" ? "active" : ""}`} onClick={() => setTab("centros")}>Centros de Costo</button>
        <button className={`tab-btn ${tab === "cargos" ? "active" : ""}`} onClick={() => setTab("cargos")}>Cargos</button>
        <button className={`tab-btn ${tab === "licencia" ? "active" : ""}`} onClick={() => setTab("licencia")}>Licencia y Pagos</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {tab === "empresa" && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Datos de la Empresa</h2>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">RIF</label>
              <input className="form-input" value={form.rif} onChange={(e) => setForm({ ...form, rif: e.target.value })} placeholder="J-12345678-9" />
            </div>
            <div className="form-group">
              <label className="form-label">Razón Social</label>
              <input className="form-input" value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre Comercial</label>
              <input className="form-input" value={form.nombreComercial} onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Dirección Fiscal</label>
            <textarea className="form-textarea" rows={2} value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={handleSaveEmpresa} disabled={saving}>{saving ? "Guardando..." : "Guardar Cambios"}</button>
        </div>
      )}

      {tab === "nomina" && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Parámetros de Nómina — LOTTT / IVSS</h2>
          </div>
          <div className="alert alert-warning">
            <strong>Parámetros de riesgo IVSS:</strong> El porcentaje patronal varía entre 9% y 11% según el tipo de riesgo de la empresa.
            Consulte con su asesor legal para confirmar los porcentajes aplicables.
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Periodicidad de Nómina</label>
              <select className="form-select" value={form.periodicidadNomina} onChange={(e) => setForm({ ...form, periodicidadNomina: e.target.value })}>
                <option value="mensual">Mensual</option>
                <option value="quincenal">Quincenal</option>
                <option value="semanal">Semanal</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Días de Utilidades</label>
              <input type="number" className="form-input" value={form.diasUtilidades} onChange={(e) => setForm({ ...form, diasUtilidades: parseInt(e.target.value) })} min="15" max="120" />
              <div className="form-hint">Mínimo legal: 15 días (Art. 131 LOTTT)</div>
            </div>
          </div>
          <div style={{ fontWeight: 600, marginBottom: "12px", marginTop: "16px" }}>IVSS (Seguro Social)</div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">IVSS Patronal (%)</label>
              <input type="number" className="form-input" value={form.ivssPatronal} onChange={(e) => setForm({ ...form, ivssPatronal: parseFloat(e.target.value) })} min="9" max="11" step="0.5" />
              <div className="form-hint">9%, 10% u 11% según riesgo</div>
            </div>
            <div className="form-group">
              <label className="form-label">IVSS Obrero (%)</label>
              <input type="number" className="form-input" value={form.ivssObrero} onChange={(e) => setForm({ ...form, ivssObrero: parseFloat(e.target.value) })} min="4" max="4" step="0.5" />
              <div className="form-hint">Fijo: 4%</div>
            </div>
          </div>
          <div style={{ fontWeight: 600, marginBottom: "12px", marginTop: "16px" }}>RPE (Régimen Prestacional Empleo)</div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">RPE Patronal (%)</label>
              <input type="number" className="form-input" value={form.rpePatronal} onChange={(e) => setForm({ ...form, rpePatronal: parseFloat(e.target.value) })} step="0.1" />
              <div className="form-hint">2%</div>
            </div>
            <div className="form-group">
              <label className="form-label">RPE Obrero (%)</label>
              <input type="number" className="form-input" value={form.rpeObrero} onChange={(e) => setForm({ ...form, rpeObrero: parseFloat(e.target.value) })} step="0.1" />
              <div className="form-hint">0.5%</div>
            </div>
          </div>
          <div style={{ fontWeight: 600, marginBottom: "12px", marginTop: "16px" }}>LPH / BANAVIH (Política Habitacional)</div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">LPH Patronal (%)</label>
              <input type="number" className="form-input" value={form.lphPatronal} onChange={(e) => setForm({ ...form, lphPatronal: parseFloat(e.target.value) })} step="0.1" />
              <div className="form-hint">2%</div>
            </div>
            <div className="form-group">
              <label className="form-label">LPH Obrero (%)</label>
              <input type="number" className="form-input" value={form.lphObrero} onChange={(e) => setForm({ ...form, lphObrero: parseFloat(e.target.value) })} step="0.1" />
              <div className="form-hint">1%</div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: "8px" }} onClick={handleSaveEmpresa} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Parámetros"}
          </button>
        </div>
      )}

      {tab === "centros" && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Centros de Costo</h2>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "flex-end" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Código</label>
              <input className="form-input" style={{ width: "100px" }} value={nuevoCentro.codigo} onChange={(e) => setNuevoCentro({ ...nuevoCentro, codigo: e.target.value })} placeholder="001" />
            </div>
            <div className="form-group" style={{ margin: 0, flex: 1 }}>
              <label className="form-label">Nombre</label>
              <input className="form-input" value={nuevoCentro.nombre} onChange={(e) => setNuevoCentro({ ...nuevoCentro, nombre: e.target.value })} placeholder="Nombre del centro de costo" />
            </div>
            <button className="btn btn-primary" onClick={handleAddCentro}>Agregar</button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Código</th><th>Nombre</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {centrosCosto.map((c) => (
                  <tr key={c.id}>
                    <td className="text-mono">{c.codigo}</td>
                    <td>{c.nombre}</td>
                    <td><span className={`badge ${c.activo ? "badge-success" : "badge-neutral"}`}>{c.activo ? "Activo" : "Inactivo"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "cargos" && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Cargos / Puestos</h2>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "flex-end" }}>
            <div className="form-group" style={{ margin: 0, flex: 1 }}>
              <label className="form-label">Nombre del Cargo</label>
              <input className="form-input" value={nuevoCargo.nombre} onChange={(e) => setNuevoCargo({ ...nuevoCargo, nombre: e.target.value })} placeholder="Nombre del cargo" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nivel</label>
              <select className="form-select" value={nuevoCargo.nivel} onChange={(e) => setNuevoCargo({ ...nuevoCargo, nivel: e.target.value })}>
                <option value="">Seleccionar...</option>
                <option value="operativo">Operativo</option>
                <option value="tecnico">Técnico</option>
                <option value="profesional">Profesional</option>
                <option value="gerencial">Gerencial</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleAddCargo}>Agregar</button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Nombre</th><th>Nivel</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {cargos.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td style={{ textTransform: "capitalize" }}>{c.nivel || "—"}</td>
                    <td><span className={`badge ${c.activo ? "badge-success" : "badge-neutral"}`}>{c.activo ? "Activo" : "Inactivo"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "licencia" && (
        <>
          <div className="card" style={{ marginBottom: "20px" }}>
            <div className="card-header">
              <h2 className="card-title">Estado de Licencia</h2>
            </div>
            <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              <div className="stat-card">
                <div className="stat-label">Plan Actual</div>
                <div className="stat-value" style={{ fontSize: "18px", textTransform: "capitalize" }}>{initial.planLicencia}</div>
              </div>
              <div className={`stat-card ${initial.licenciaStatus === "activa" ? "success" : "danger"}`}>
                <div className="stat-label">Estado</div>
                <div className="stat-value" style={{ fontSize: "18px", textTransform: "capitalize" }}>{initial.licenciaStatus}</div>
                <div className="stat-sub">{initial.licenciaExpira ? `Vence: ${new Date(initial.licenciaExpira).toLocaleDateString("es-VE")}` : "Sin fecha"}</div>
              </div>
            </div>

            <div style={{ marginTop: "16px", marginBottom: "16px" }}>
              <div style={{ fontWeight: 600, marginBottom: "12px" }}>Planes Disponibles</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                {PLANES.map((p) => (
                  <div key={p.id} style={{
                    border: `2px solid ${initial.planLicencia === p.id ? "var(--color-secondary)" : "var(--color-border)"}`,
                    borderRadius: "6px", padding: "14px",
                    background: initial.planLicencia === p.id ? "#eff6ff" : "white",
                  }}>
                    <div style={{ fontWeight: 700 }}>{p.nombre}</div>
                    <div style={{ color: "var(--color-secondary)", fontWeight: 600, fontSize: "14px" }}>{p.precio}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{p.descripcion}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "20px" }}>
            <div className="card-header">
              <h2 className="card-title">Registrar Pago de Licencia</h2>
            </div>
            <div className="alert alert-info">
              Envíe el comprobante de pago y el Master verificará y activará su licencia. Métodos aceptados:
              <strong> Binance Pay (USDT), Zinli (USD), Pago Móvil (VES), Banesco Panamá (USD)</strong>.
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Método de Pago</label>
                <select className="form-select" value={pagoForm.metodoPago} onChange={(e) => {
                  const m = METODOS_PAGO.find((x) => x.id === e.target.value);
                  const moneda = e.target.value === "pago_movil" ? "VES" : "USD";
                  setPagoForm({ ...pagoForm, metodoPago: e.target.value, moneda });
                }}>
                  {METODOS_PAGO.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Plan Solicitado</label>
                <select className="form-select" value={pagoForm.planSolicitado} onChange={(e) => setPagoForm({ ...pagoForm, planSolicitado: e.target.value })}>
                  {PLANES.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Meses</label>
                <select className="form-select" value={pagoForm.mesesSolicitados} onChange={(e) => setPagoForm({ ...pagoForm, mesesSolicitados: e.target.value })}>
                  <option value="1">1 mes</option>
                  <option value="3">3 meses</option>
                  <option value="6">6 meses</option>
                  <option value="12">12 meses (1 año)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monto Pagado</label>
                <input type="number" className="form-input" value={pagoForm.monto} onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })} step="0.01" placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Moneda</label>
                <select className="form-select" value={pagoForm.moneda} onChange={(e) => setPagoForm({ ...pagoForm, moneda: e.target.value })}>
                  <option value="USD">USD</option>
                  <option value="USDT">USDT</option>
                  <option value="VES">VES</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de Pago</label>
                <input type="date" className="form-input" value={pagoForm.fechaPago} onChange={(e) => setPagoForm({ ...pagoForm, fechaPago: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Número de Referencia / Txn Hash</label>
              <input className="form-input" value={pagoForm.referencia} onChange={(e) => setPagoForm({ ...pagoForm, referencia: e.target.value })} placeholder="Número de confirmación de transacción" />
            </div>
            <div className="form-group">
              <label className="form-label">Notas adicionales</label>
              <textarea className="form-textarea" rows={2} value={pagoForm.notas} onChange={(e) => setPagoForm({ ...pagoForm, notas: e.target.value })} />
            </div>
            <button className="btn btn-primary" onClick={handleSendPago} disabled={savingPago}>
              {savingPago ? "Enviando..." : "Enviar Comprobante de Pago"}
            </button>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Historial de Pagos</h2>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Fecha</th><th>Método</th><th>Referencia</th><th>Monto</th><th>Plan</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {pagos.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "var(--color-text-muted)" }}>No hay pagos registrados</td></tr>
                  ) : pagos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.fechaPago}</td>
                      <td style={{ textTransform: "capitalize" }}>{p.metodoPago.replace("_", " ")}</td>
                      <td className="text-mono">{p.referencia}</td>
                      <td className="text-mono">{p.monto} {p.moneda}</td>
                      <td style={{ textTransform: "capitalize" }}>{p.planSolicitado} × {p.mesesSolicitados}m</td>
                      <td>
                        <span className={`badge ${p.status === "verificado" ? "badge-success" : p.status === "rechazado" ? "badge-danger" : "badge-warning"}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
