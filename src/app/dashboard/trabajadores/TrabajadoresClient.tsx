"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Trabajador {
  id: string;
  cedula: string;
  nombre: string;
  apellido: string;
  salarioBase: number;
  monedaSalario: string;
  fechaIngreso: string;
  fechaEgreso: string | null;
  status: string;
  banco: string | null;
  numeroCuentaBancaria: string | null;
  cestaBono: number;
  nssIvss: string | null;
  tipoContrato: string;
  cargoId: string | null;
  centroCostoId: string | null;
  cargoNombre: string | null;
  centroCostoNombre: string | null;
}

interface Props {
  trabajadores: Trabajador[];
  cargos: { id: string; nombre: string }[];
  centrosCosto: { id: string; nombre: string; codigo: string }[];
  canEdit: boolean;
}

const BANCOS_VE = [
  "Banesco", "Mercantil", "Provincial (BBVA)", "Venezuela", "Bicentenario",
  "Del Tesoro", "BNC", "Exterior", "Activo", "Sofitasa", "BOD", "Fondo Común",
];

const emptyForm = {
  cedula: "", nombre: "", apellido: "", fechaNacimiento: "", sexo: "", estadoCivil: "",
  numeroCuentaBancaria: "", banco: "", cargoId: "", centroCostoId: "",
  fechaIngreso: "", tipoContrato: "tiempo_indeterminado",
  salarioBase: "", monedaSalario: "VES", nssIvss: "", cestaBono: "0",
};

export default function TrabajadoresClient({ trabajadores: initial, cargos, centrosCosto, canEdit }: Props) {
  const router = useRouter();
  const [trabajadores, setTrabajadores] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("activo");

  function openNew() {
    setForm({ ...emptyForm });
    setEditId(null);
    setError("");
    setShowModal(true);
  }

  function openEdit(t: Trabajador) {
    setForm({
      cedula: t.cedula,
      nombre: t.nombre,
      apellido: t.apellido,
      fechaNacimiento: "",
      sexo: "",
      estadoCivil: "",
      numeroCuentaBancaria: t.numeroCuentaBancaria || "",
      banco: t.banco || "",
      cargoId: t.cargoId || "",
      centroCostoId: t.centroCostoId || "",
      fechaIngreso: t.fechaIngreso,
      tipoContrato: t.tipoContrato,
      salarioBase: String(t.salarioBase),
      monedaSalario: t.monedaSalario,
      nssIvss: t.nssIvss || "",
      cestaBono: String(t.cestaBono),
    });
    setEditId(t.id);
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, salarioBase: parseFloat(form.salarioBase), cestaBono: parseFloat(form.cestaBono) };
      const method = editId ? "PUT" : "POST";
      const body = editId ? { id: editId, ...payload } : payload;
      const res = await fetch("/api/trabajadores", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error || "Error al guardar"); return; }
      router.refresh();
      setShowModal(false);
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const filtered = trabajadores.filter((t) => {
    const matchFiltro = !filtro || `${t.nombre} ${t.apellido} ${t.cedula}`.toLowerCase().includes(filtro.toLowerCase());
    const matchStatus = !statusFiltro || t.status === statusFiltro;
    return matchFiltro && matchStatus;
  });

  const fmt = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Registro de Trabajadores</h2>
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nuevo Trabajador</button>
          )}
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <input
            type="search"
            className="form-input"
            style={{ maxWidth: "280px" }}
            placeholder="Buscar por nombre, apellido o cédula..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <select
            className="form-select"
            style={{ maxWidth: "160px" }}
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="egresado">Egresados</option>
            <option value="suspendido">Suspendidos</option>
          </select>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cédula</th>
                <th>Nombre</th>
                <th>Cargo</th>
                <th>Centro Costo</th>
                <th className="text-right">Salario Base</th>
                <th>Banco</th>
                <th>Ingreso</th>
                <th>Estado</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "var(--color-text-muted)" }}>No hay trabajadores registrados.</td></tr>
              ) : filtered.map((t) => (
                <tr key={t.id}>
                  <td className="text-mono">{t.cedula}</td>
                  <td style={{ fontWeight: 500 }}>{t.apellido}, {t.nombre}</td>
                  <td className="text-muted">{t.cargoNombre || "—"}</td>
                  <td className="text-muted">{t.centroCostoNombre || "—"}</td>
                  <td className="text-right text-mono">
                    {t.monedaSalario === "USD" ? "$ " : "Bs. "}{fmt(t.salarioBase)}
                  </td>
                  <td className="text-muted">{t.banco || "—"}</td>
                  <td className="text-muted text-sm">{t.fechaIngreso}</td>
                  <td>
                    <span className={`badge ${
                      t.status === "activo" ? "badge-success" :
                      t.status === "egresado" ? "badge-neutral" :
                      t.status === "suspendido" ? "badge-warning" : "badge-danger"
                    }`}>{t.status}</span>
                  </td>
                  {canEdit && (
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: "720px" }}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? "Editar Trabajador" : "Nuevo Trabajador"}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}

              <div style={{ marginBottom: "16px", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", paddingBottom: "6px" }}>
                Datos Personales
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Cédula <span className="required">*</span></label>
                  <input className="form-input" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} placeholder="V-12345678" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre <span className="required">*</span></label>
                  <input className="form-input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido <span className="required">*</span></label>
                  <input className="form-input" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">NSS IVSS</label>
                  <input className="form-input" value={form.nssIvss} onChange={(e) => setForm({ ...form, nssIvss: e.target.value })} placeholder="0000000000" />
                </div>
              </div>

              <div style={{ marginBottom: "16px", marginTop: "16px", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", paddingBottom: "6px" }}>
                Datos Laborales
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Cargo</label>
                  <select className="form-select" value={form.cargoId} onChange={(e) => setForm({ ...form, cargoId: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {cargos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Centro de Costo</label>
                  <select className="form-select" value={form.centroCostoId} onChange={(e) => setForm({ ...form, centroCostoId: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {centrosCosto.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Ingreso <span className="required">*</span></label>
                  <input type="date" className="form-input" value={form.fechaIngreso} onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de Contrato</label>
                  <select className="form-select" value={form.tipoContrato} onChange={(e) => setForm({ ...form, tipoContrato: e.target.value })}>
                    <option value="tiempo_indeterminado">Tiempo Indeterminado</option>
                    <option value="tiempo_determinado">Tiempo Determinado</option>
                    <option value="obra_determinada">Obra Determinada</option>
                    <option value="practicante">Pasante/Practicante</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "16px", marginTop: "16px", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", paddingBottom: "6px" }}>
                Salario y Pagos
              </div>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Salario Base <span className="required">*</span></label>
                  <input type="number" className="form-input" value={form.salarioBase} onChange={(e) => setForm({ ...form, salarioBase: e.target.value })} step="0.01" min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Moneda</label>
                  <select className="form-select" value={form.monedaSalario} onChange={(e) => setForm({ ...form, monedaSalario: e.target.value })}>
                    <option value="VES">Bolívares (VES)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cesta Ticket / Bono</label>
                  <input type="number" className="form-input" value={form.cestaBono} onChange={(e) => setForm({ ...form, cestaBono: e.target.value })} step="0.01" min="0" />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Banco</label>
                  <select className="form-select" value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })}>
                    <option value="">Seleccionar banco...</option>
                    {BANCOS_VE.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Número de Cuenta</label>
                  <input className="form-input" value={form.numeroCuentaBancaria} onChange={(e) => setForm({ ...form, numeroCuentaBancaria: e.target.value })} placeholder="0001-0000-00-0000000000" maxLength={20} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : editId ? "Actualizar" : "Registrar Trabajador"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
