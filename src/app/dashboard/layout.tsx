import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import db from "@/db";
import { empresas } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    // Redirect to onboarding if not complete
    if (empresa && !empresa.onboardingCompleto && session.rol === "admin") {
      // Only redirect if not already on config page
    }
  }

  return (
    <div className="app-layout">
      <Sidebar rol={session.rol} nombre={session.nombre} empresaNombre={empresaNombre} />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
