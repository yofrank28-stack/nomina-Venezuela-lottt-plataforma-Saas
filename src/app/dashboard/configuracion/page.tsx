import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import db from "@/db";
import { empresas, centrosCosto, cargos, pagosLicencias } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import ConfiguracionClient from "./ConfiguracionClient";

export default async function ConfiguracionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.empresaId) redirect("/login");
  if (session.rol !== "admin") redirect("/dashboard");

  const empresaId = session.empresaId;

  const empresa = db.select().from(empresas).where(eq(empresas.id, empresaId)).get();
  if (!empresa) redirect("/login");

  const listaCentros = db.select()
    .from(centrosCosto)
    .where(eq(centrosCosto.empresaId, empresaId))
    .all();

  const listaCargos = db.select()
    .from(cargos)
    .where(eq(cargos.empresaId, empresaId))
    .all();

  const misPagos = db.select()
    .from(pagosLicencias)
    .where(eq(pagosLicencias.empresaId, empresaId))
    .orderBy(desc(pagosLicencias.creadoEn))
    .limit(10)
    .all();

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">Configuración de Empresa</h1>
      </div>
      <div className="page-content">
        <ConfiguracionClient
          empresa={empresa}
          centrosCosto={listaCentros}
          cargos={listaCargos}
          pagos={misPagos}
        />
      </div>
    </>
  );
}
