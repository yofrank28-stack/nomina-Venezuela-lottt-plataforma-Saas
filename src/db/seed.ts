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

  // Trabajadores demo con cuentas bancarias de 20 dígitos
  const trab1Id = randomUUID();
  sqlite.prepare(`
    INSERT OR IGNORE INTO trabajadores (id, empresa_id, cedula, nombre, apellido, fecha_ingreso, salario_base, cargo_id, centro_costo_id, banco, numero_cuenta_bancaria, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
  `).run(trab1Id, empresaId, "V-12345678", "Juan", "Pérez", "2023-01-15", 5000, cargoId, ccId, "banesco", "0001-00001234-5678901234");

  const trab2Id = randomUUID();
  sqlite.prepare(`
    INSERT OR IGNORE INTO trabajadores (id, empresa_id, cedula, nombre, apellido, fecha_ingreso, salario_base, cargo_id, centro_costo_id, banco, numero_cuenta_bancaria, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
  `).run(trab2Id, empresaId, "V-23456789", "María", "López", "2023-03-20", 4500, cargoId, ccId, "mercantil", "0005-00005678-9012345678");

  const trab3Id = randomUUID();
  sqlite.prepare(`
    INSERT OR IGNORE INTO trabajadores (id, empresa_id, cedula, nombre, apellido, fecha_ingreso, salario_base, cargo_id, centro_costo_id, banco, numero_cuenta_bancaria, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
  `).run(trab3Id, empresaId, "V-34567890", "Carlos", "Ruíz", "2023-06-10", 3000, cargoId, ccId, "banesco", "0001-00009012-3456789012");

  // Eliminar trabajador demo anterior sin banco
  sqlite.prepare(`DELETE FROM trabajadores WHERE numero_cuenta_bancaria IS NULL OR numero_cuenta_bancaria = ''`).run();

  // Agregar intereses de prestaciones para el mes actual
  const hoy = new Date();
  const trabs = sqlite.prepare(`SELECT id, salario_base, fecha_ingreso FROM trabajadores WHERE empresa_id = ?`).all(empresaId) as { id: string; salario_base: number; fecha_ingreso: string }[];
  
  for (const trab of trabs) {
    const ingreso = new Date(trab.fecha_ingreso);
    const diffDias = Math.floor((hoy.getTime() - ingreso.getTime()) / (1000 * 60 * 60 * 24));
    const anios = Math.floor(diffDias / 365);
    const trimestres = Math.floor(diffDias / 90);
    const salarioDiario = trab.salario_base / 30;
    
    // Calcular intereses del trimestre actual
    const diasGarantiaTrimestre = 15;
    const montoGarantiaTrimestre = diasGarantiaTrimestre * (salarioDiario * 1.1); // aproximado salario integral
    const TASA_MENSUAL = 58.30 / 100 / 12;
    const interesesTrimestre = montoGarantiaTrimestre * TASA_MENSUAL;
    
    sqlite.prepare(`
      INSERT OR IGNORE INTO prestaciones_sociales 
        (id, empresa_id, trabajador_id, anio, trimestre, salario_diario_integral, dias_garantia, monto_garantia, intereses_garantia, tasa_interes_aplicada, dias_retroactividad, monto_retroactividad, monto_final, via_aplicada, creado_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(), empresaId, trab.id, 
      hoy.getFullYear(), Math.ceil((hoy.getMonth() + 1) / 3),
      salarioDiario * 1.1, diasGarantiaTrimestre, montoGarantiaTrimestre,
      interesesTrimestre, 58.30,
      anios * 30, (anios * 30) * (salarioDiario * 1.1),
      Math.max(montoGarantiaTrimestre + interesesTrimestre, anios * 30 * salarioDiario * 1.1),
      montoGarantiaTrimestre + interesesTrimestre > anios * 30 * salarioDiario * 1.1 ? "garantia" : "retroactividad",
      hoy.toISOString()
    );
  }

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
