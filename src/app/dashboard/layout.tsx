import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import db from "@/db";
import { empresas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTasaVigente } from "@/lib/tasas";
import BcvWidget from "@/components/ui/BcvWidget";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol === "master") redirect("/master");

  let empresaNombre = "";
  if (session.empresaId) {
    const empresa = db.select({ razonSocial: empresas.razonSocial, onboardingCompleto: empresas.onboardingCompleto })
      .from(empresas)
      .where(eq(empresas.id, session.empresaId))
      .get();
    empresaNombre = empresa?.razonSocial || "";

    if (empresa && !empresa.onboardingCompleto && session.rol === "admin") {
      // Only redirect if not already on config page
    }
  }

  const tasaBCV = getTasaVigente("bcv_usd_ves");
  const tasaActiva = getTasaVigente("tasa_activa_bcv");

  return (
    <div className="app-layout">
      <Sidebar rol={session.rol} nombre={session.nombre} empresaNombre={empresaNombre} />
      <div className="main-content">
        <div className="topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div></div>
          <BcvWidget tasaUsd={tasaBCV?.valor || 0} tasaInteres={tasaActiva?.valor || 0} />
        </div>
        {children}
      </div>
    </div>
  );
}
