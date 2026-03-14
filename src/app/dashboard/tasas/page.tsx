import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTasaVigente, getHistorialTasas } from "@/lib/tasas";
import TasasClient from "./TasasClient";

export default async function TasasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tasaBCV = getTasaVigente("bcv_usd_ves");
  const tasaActiva = getTasaVigente("tasa_activa_bcv");
  const historialBCV = getHistorialTasas("bcv_usd_ves", 30);
  const historialActiva = getHistorialTasas("tasa_activa_bcv", 30);

  const canUpdate = session.rol === "master" || session.rol === "admin";

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">Tasas BCV y Banco Central</h1>
        {tasaBCV && (
          <div className="bcv-indicator">
            <span className="bcv-dot"></span>
            USD/VES: Bs. {tasaBCV.valor.toFixed(2)}
          </div>
        )}
      </div>
      <div className="page-content">
        <div className="alert alert-info">
          Las tasas BCV se utilizan para convertir montos USD/VES, calcular la base de la Contribución Especial de Pensiones (CEPP)
          e indexar el salario mínimo. La Tasa Activa del BCV se usa para calcular los intereses sobre las Prestaciones Sociales.
          Todas las actualizaciones quedan registradas en el log de auditoría para recálculos retroactivos.
        </div>
        <TasasClient
          tasaBCV={tasaBCV}
          tasaActiva={tasaActiva}
          historialBCV={historialBCV}
          historialActiva={historialActiva}
          canUpdate={canUpdate}
        />
      </div>
    </>
  );
}
