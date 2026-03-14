"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { error?: string; user?: { rol: string } };
      if (!res.ok) {
        setError(data.error || "Error de autenticación");
        return;
      }
      if (data.user?.rol === "master") {
        router.push("/master");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-icon">₿</div>
          <h1>Nómina Venezuela</h1>
          <p>Plataforma SaaS de Nómina LOTTT</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: "20px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="usuario@empresa.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ justifyContent: "center", marginTop: "8px", padding: "12px", fontSize: "14px" }}
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner" style={{ width: 16, height: 16 }}></span>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        <div style={{ marginTop: "28px", borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
          <p style={{ fontSize: "11px", color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.6 }}>
            Sistema protegido. Acceso restringido a usuarios autorizados.
          </p>
          <p style={{ fontSize: "11px", color: "var(--color-text-muted)", textAlign: "center", marginTop: "8px" }}>
            Conforme a la LOTTT (2012) y normativas BCV vigentes.
          </p>
        </div>

        <div style={{ 
          marginTop: "20px", 
          padding: "12px", 
          background: "var(--color-primary-dark)", 
          borderRadius: "6px",
          fontSize: "11px",
          color: "var(--color-text-secondary)"
        }}>
          <div style={{ fontWeight: 600, marginBottom: "8px", color: "var(--color-text)" }}>Credenciales Demo:</div>
          <div style={{ display: "grid", gap: "4px" }}>
            <div><span style={{ color: "var(--color-secondary)" }}>Master:</span> master@nominavenezuela.com</div>
            <div><span style={{ color: "var(--color-secondary)" }}>Admin:</span> admin@empresa.com</div>
            <div><span style={{ color: "var(--color-text-muted)" }}>Password:</span> Master@2024! / Admin@2024!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
