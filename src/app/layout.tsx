import type { Metadata } from "next";
import "./globals.css";
import { runMigrations } from "@/db/migrate";

// Run migrations on server startup
if (typeof window === "undefined") {
  try {
    runMigrations();
  } catch {
    // Already migrated
  }
}

export const metadata: Metadata = {
  title: "Nómina Venezuela - Plataforma SaaS de Nómina",
  description: "Sistema de gestión de nómina conforme a la LOTTT para Venezuela",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
