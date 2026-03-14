import { runMigrations } from "./migrate";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { randomUUID } from "crypto";

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), "nomina_venezuela.db");

async function seed() {
  runMigrations();
  const sqlite = new Database(DB_PATH);

  // Master user
  const masterId = randomUUID();
  const masterHash = await bcrypt.hash("Master@2024!", 10);
  sqlite.prepare(`
    INSERT OR IGNORE INTO usuarios (id, empresa_id, email, password_hash, nombre, apellido, rol)
    VALUES (?, NULL, ?, ?, 'Super', 'Administrador', 'master')
  `).run(masterId, "master@nominavenezuela.com", masterHash);

  // Demo empresa
  const empresaId = randomUUID();
  sqlite.prepare(`
    INSERT OR IGNORE INTO empresas (id, rif, razon_social, nombre_comercial, email, licencia_status, onboarding_completo)
    VALUES (?, ?, ?, ?, ?, 'trial', 0)
  `).run(empresaId, "J-12345678-9", "EMPRESA DEMO C.A.", "Demo Empresa", "demo@empresa.com");

  // Admin de empresa demo
  const adminId = randomUUID();
  const adminHash = await bcrypt.hash("Admin@2024!", 10);
  sqlite.prepare(`
    INSERT OR IGNORE INTO usuarios (id, empresa_id, email, password_hash, nombre, apellido, rol)
    VALUES (?, ?, ?, ?, 'Ana', 'García', 'admin')
  `).run(adminId, empresaId, "admin@empresa.com", adminHash);

  // Analista demo
  const analistaId = randomUUID();
  const analistaHash = await bcrypt.hash("Analista@2024!", 10);
  sqlite.prepare(`
    INSERT OR IGNORE INTO usuarios (id, empresa_id, email, password_hash, nombre, apellido, rol)
    VALUES (?, ?, ?, ?, 'Carlos', 'López', 'analista')
  `).run(analistaId, empresaId, "analista@empresa.com", analistaHash);

  // Centro de costo default
  const ccId = randomUUID();
  sqlite.prepare(`
    INSERT OR IGNORE INTO centros_costo (id, empresa_id, codigo, nombre)
    VALUES (?, ?, ?, ?)
  `).run(ccId, empresaId, "001", "Administración General");

  // Cargo default
  const cargoId = randomUUID();
  sqlite.prepare(`
    INSERT OR IGNORE INTO cargos (id, empresa_id, nombre, nivel)
    VALUES (?, ?, ?, ?)
  `).run(cargoId, empresaId, "Asistente Administrativo", "operativo");

  // Trabajador demo
  const trabId = randomUUID();
  sqlite.prepare(`
    INSERT OR IGNORE INTO trabajadores (id, empresa_id, cedula, nombre, apellido, fecha_ingreso, salario_base, cargo_id, centro_costo_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
  `).run(trabId, empresaId, "V-12345678", "Pedro", "Martínez", "2023-01-15", 500, cargoId, ccId);

  // Tasa BCV demo
  const tasaId = randomUUID();
  sqlite.prepare(`
    INSERT OR IGNORE INTO tasas (id, tipo, valor, fecha_vigencia, fuente)
    VALUES (?, 'bcv_usd_ves', ?, datetime('now'), 'manual')
  `).run(tasaId, 36.50);

  // Tasa activa BCV
  const tasaActivaId = randomUUID();
  sqlite.prepare(`
    INSERT OR IGNORE INTO tasas (id, tipo, valor, fecha_vigencia, fuente)
    VALUES (?, 'tasa_activa_bcv', ?, datetime('now'), 'manual')
  `).run(tasaActivaId, 28.5);

  sqlite.close();
  console.log("✓ Seed completado:");
  console.log("  master@nominavenezuela.com / Master@2024!");
  console.log("  admin@empresa.com / Admin@2024!");
  console.log("  analista@empresa.com / Analista@2024!");
}

seed().catch(console.error);
