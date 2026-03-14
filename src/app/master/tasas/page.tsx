import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTasaVigente, getHistorialTasas } from "@/lib/tasas";
import TasasClient from "@/app/dashboard/tasas/TasasClient";

export default async function MasterTasasPage() {
  const session = await getSession();
  if (!session || session.rol !== "master") redirect("/login");

  const tasaBCV = getTasaVigente("bcv_usd_ves");
  const tasaActiva = getTasaVigente("tasa_activa_bcv");
  const historialBCV = getHistorialTasas("bcv_usd_ves", 60);
  const historialActiva = getHistorialTasas("tasa_activa_bcv", 60);

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">Gestión de Tasas BCV</h1>
      </div>
      <div className="page-content">
        <TasasClient
          tasaBCV={tasaBCV}
          tasaActiva={tasaActiva}
          historialBCV={historialBCV}
          historialActiva={historialActiva}
          canUpdate={true}
        />
      </div>
    </>
  );
}
