import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), "nomina_venezuela.db");

export function runMigrations() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS empresas (
      id TEXT PRIMARY KEY,
      rif TEXT NOT NULL UNIQUE,
      razon_social TEXT NOT NULL,
      nombre_comercial TEXT,
      direccion TEXT,
      telefono TEXT,
      email TEXT,
      ivss_patronal REAL NOT NULL DEFAULT 9,
      ivss_obrero REAL NOT NULL DEFAULT 4,
      rpe_patronal REAL NOT NULL DEFAULT 2,
      rpe_obrero REAL NOT NULL DEFAULT 0.5,
      lph_patronal REAL NOT NULL DEFAULT 2,
      lph_obrero REAL NOT NULL DEFAULT 1,
      periodicidad_nomina TEXT NOT NULL DEFAULT 'mensual',
      dias_habiles_semanales INTEGER NOT NULL DEFAULT 5,
      dias_utilidades INTEGER NOT NULL DEFAULT 15,
      licencia_status TEXT NOT NULL DEFAULT 'trial',
      licencia_expira TEXT,
      plan_licencia TEXT NOT NULL DEFAULT 'basico',
      onboarding_completo INTEGER NOT NULL DEFAULT 0,
      onboarding_paso INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now')),
      actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
      activo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS centros_costo (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id),
      codigo TEXT NOT NULL,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_centros_empresa ON centros_costo(empresa_id);

    CREATE TABLE IF NOT EXISTS cargos (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id),
      nombre TEXT NOT NULL,
      descripcion TEXT,
      nivel TEXT,
      activo INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_cargos_empresa ON cargos(empresa_id);

    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      empresa_id TEXT REFERENCES empresas(id),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      cedula TEXT,
      telefono TEXT,
      rol TEXT NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1,
      primer_login INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now')),
      ultimo_acceso TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios(empresa_id);

    CREATE TABLE IF NOT EXISTS trabajadores (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id),
      usuario_id TEXT REFERENCES usuarios(id),
      cedula TEXT NOT NULL,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      fecha_nacimiento TEXT,
      sexo TEXT,
      estado_civil TEXT,
      numero_cuenta_bancaria TEXT,
      banco TEXT,
      cargo_id TEXT REFERENCES cargos(id),
      centro_costo_id TEXT REFERENCES centros_costo(id),
      fecha_ingreso TEXT NOT NULL,
      fecha_egreso TEXT,
      motivo_egreso TEXT,
      tipo_contrato TEXT NOT NULL DEFAULT 'tiempo_indeterminado',
      salario_base REAL NOT NULL,
      moneda_salario TEXT NOT NULL DEFAULT 'VES',
      nss_ivss TEXT,
      cesta_bono REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'activo',
      creado_en TEXT NOT NULL DEFAULT (datetime('now')),
      actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_trabajadores_empresa ON trabajadores(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_trabajadores_cedula_empresa ON trabajadores(cedula, empresa_id);

    CREATE TABLE IF NOT EXISTS tasas (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      valor REAL NOT NULL,
      fecha_vigencia TEXT NOT NULL,
      fuente TEXT,
      url_fuente TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now')),
      creado_por TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tasas_tipo_fecha ON tasas(tipo, fecha_vigencia);

    CREATE TABLE IF NOT EXISTS periodos_nomina (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id),
      tipo TEXT NOT NULL,
      anio INTEGER NOT NULL,
      mes INTEGER NOT NULL,
      quincena INTEGER,
      semana INTEGER,
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'borrador',
      tasa_bcv_id TEXT REFERENCES tasas(id),
      aprobado_por TEXT,
      aprobado_en TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_periodos_empresa ON periodos_nomina(empresa_id);

    CREATE TABLE IF NOT EXISTS recibos_pago (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id),
      periodo_id TEXT NOT NULL REFERENCES periodos_nomina(id),
      trabajador_id TEXT NOT NULL REFERENCES trabajadores(id),
      salario_base REAL NOT NULL,
      dias_trabajados REAL NOT NULL DEFAULT 30,
      salario_diario REAL NOT NULL,
      cesta_bono REAL NOT NULL DEFAULT 0,
      bono_transporte REAL NOT NULL DEFAULT 0,
      bono_alimentacion REAL NOT NULL DEFAULT 0,
      otras_asignaciones REAL NOT NULL DEFAULT 0,
      horas_extras_monto REAL NOT NULL DEFAULT 0,
      total_asignaciones REAL NOT NULL,
      ivss_obrero REAL NOT NULL DEFAULT 0,
      rpe_obrero REAL NOT NULL DEFAULT 0,
      lph_obrero REAL NOT NULL DEFAULT 0,
      contribucion_pensiones REAL NOT NULL DEFAULT 0,
      adelanto_quincena REAL NOT NULL DEFAULT 0,
      otras_deducciones REAL NOT NULL DEFAULT 0,
      total_deducciones REAL NOT NULL,
      salario_neto REAL NOT NULL,
      tasa_bcv REAL,
      salario_neto_usd REAL,
      status TEXT NOT NULL DEFAULT 'calculado',
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_recibos_empresa ON recibos_pago(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_recibos_trabajador ON recibos_pago(trabajador_id);
    CREATE INDEX IF NOT EXISTS idx_recibos_periodo ON recibos_pago(periodo_id);

    CREATE TABLE IF NOT EXISTS horas_extras (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id),
      trabajador_id TEXT NOT NULL REFERENCES trabajadores(id),
      periodo_id TEXT REFERENCES periodos_nomina(id),
      fecha TEXT NOT NULL,
      tipo_hora TEXT NOT NULL,
      cantidad_horas REAL NOT NULL,
      recargo REAL NOT NULL,
      monto_pagado REAL,
      aprobado INTEGER NOT NULL DEFAULT 0,
      aprobado_por TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_horas_empresa ON horas_extras(empresa_id);

    CREATE TABLE IF NOT EXISTS prestaciones_sociales (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id),
      trabajador_id TEXT NOT NULL REFERENCES trabajadores(id),
      anio INTEGER NOT NULL,
      trimestre INTEGER NOT NULL,
      salario_diario_integral REAL NOT NULL,
      dias_garantia REAL NOT NULL DEFAULT 15,
      monto_garantia REAL NOT NULL,
      intereses_garantia REAL NOT NULL DEFAULT 0,
      tasa_interes_aplicada REAL,
      dias_retroactividad REAL NOT NULL DEFAULT 0,
      monto_retroactividad REAL NOT NULL DEFAULT 0,
      monto_final REAL NOT NULL,
      via_aplicada TEXT NOT NULL,
      tasa_bcv_id TEXT REFERENCES tasas(id),
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_prestaciones_empresa ON prestaciones_sociales(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_prestaciones_trabajador ON prestaciones_sociales(trabajador_id);

    CREATE TABLE IF NOT EXISTS vacaciones (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id),
      trabajador_id TEXT NOT NULL REFERENCES trabajadores(id),
      anio_servicio INTEGER NOT NULL,
      dias_vacaciones REAL NOT NULL,
      dias_bono_vacacional REAL NOT NULL,
      fecha_inicio TEXT,
      fecha_fin TEXT,
      salario_diario REAL NOT NULL,
      monto_vacaciones REAL NOT NULL,
      monto_bono_vacacional REAL NOT NULL,
      monto_total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendiente',
      aprobado_por TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_vacaciones_empresa ON vacaciones(empresa_id);

    CREATE TABLE IF NOT EXISTS utilidades (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id),
      trabajador_id TEXT NOT NULL REFERENCES trabajadores(id),
      anio INTEGER NOT NULL,
      dias_utilidades REAL NOT NULL,
      salario_promedio REAL NOT NULL,
      monto_utilidades REAL NOT NULL,
      dias_trabajados REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendiente',
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_utilidades_empresa ON utilidades(empresa_id);

    CREATE TABLE IF NOT EXISTS pagos_licencias (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id),
      metodo_pago TEXT NOT NULL,
      referencia TEXT NOT NULL,
      monto REAL NOT NULL,
      moneda TEXT NOT NULL,
      fecha_pago TEXT NOT NULL,
      plan_solicitado TEXT NOT NULL,
      meses_solicitados INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pendiente',
      verificado_por TEXT,
      verificado_en TEXT,
      notas TEXT,
      comprobante TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_pagos_empresa ON pagos_licencias(empresa_id);

    CREATE TABLE IF NOT EXISTS contribuciones_pensiones (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id),
      trabajador_id TEXT NOT NULL REFERENCES trabajadores(id),
      periodo_id TEXT NOT NULL REFERENCES periodos_nomina(id),
      base_calculo REAL NOT NULL,
      porcentaje REAL NOT NULL DEFAULT 9,
      monto REAL NOT NULL,
      tasa_bcv_aplicada REAL,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cepp_empresa ON contribuciones_pensiones(empresa_id);

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      empresa_id TEXT REFERENCES empresas(id),
      usuario_id TEXT REFERENCES usuarios(id),
      accion TEXT NOT NULL,
      tabla TEXT,
      registro_id TEXT,
      datos_anteriores TEXT,
      datos_nuevos TEXT,
      ip TEXT,
      user_agent TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_empresa ON audit_log(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_log(usuario_id);
  `);

  sqlite.close();
}
