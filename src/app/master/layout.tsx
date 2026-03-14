import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "master") redirect("/dashboard");

  return (
    <div className="app-layout">
      <Sidebar rol="master" nombre={session.nombre} />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
