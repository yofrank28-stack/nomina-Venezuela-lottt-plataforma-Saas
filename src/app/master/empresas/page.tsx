import db from "@/db";
import { empresas, usuarios } from "@/db/schema";
import { count, eq, desc } from "drizzle-orm";
import MasterEmpresasClient from "./MasterEmpresasClient";

export default async function MasterEmpresasPage() {
  const lista = db.select().from(empresas).orderBy(desc(empresas.creadoEn)).all();
  const usuariosCount = db.select({ empresaId: usuarios.empresaId, count: count() })
    .from(usuarios)
    .groupBy(usuarios.empresaId)
    .all();

  const ucMap = Object.fromEntries(usuariosCount.map((u) => [u.empresaId, u.count]));

  const listaConUsuarios = lista.map((e) => ({ ...e, numUsuarios: ucMap[e.id] || 0 }));

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">Gestión de Empresas</h1>
        <span className="text-muted text-sm">{lista.length} empresas registradas</span>
      </div>
      <div className="page-content">
        <MasterEmpresasClient empresas={listaConUsuarios} />
      </div>
    </>
  );
}
