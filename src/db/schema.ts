import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";

// ─── USUARIOS ────────────────────────────────────────────────────────────────
export const usuarios = sqliteTable("usuarios", {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    role: text("role").notNull(),
});

// ─── EMPRESAS (TENANTS) ──────────────────────────────────────────────────────
export const empresas = sqliteTable("empresas", {
  id: text("id").primaryKey(), // UUID
  rif: text("rif").notNull().unique(),
  razonSocial: text("razon_social").notNull(),
  ivssPatronal: real("ivss_patronal").notNull().default(9),
  ivssObrero: real("ivss_obrero").notNull().default(4),
  rpePatronal: real("rpe_patronal").notNull().default(2),
  rpeObrero: real("rpe_obrero").notNull().default(0.5),
  lphPatronal: real("lph_patronal").notNull().default(2),
  lphObrero: real("lph_obrero").notNull().default(1),
  diasUtilidades: integer("dias_utilidades").notNull().default(30),
});

// ─── CARGOS Y CENTROS DE COSTO ───────────────────────────────────────────────
export const cargos = sqliteTable("cargos", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
});

export const centrosCosto = sqliteTable("centros_costo", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
});

// ─── TRABAJADORES ────────────────────────────────────────────────────────────
export const trabajadores = sqliteTable("trabajadores", {
  id: text("id").primaryKey(),
  empresaId: text("empresa_id").notNull().references(() => empresas.id),
  cargoId: text("cargo_id").references(() => cargos.id),
  centroCostoId: text("centro_costo_id").references(() => centrosCosto.id),
  cedula: text("cedula").notNull(),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  fechaIngreso: text("fecha_ingreso").notNull(),
  salarioBase: real("salario_base").notNull(),
  cestaBono: real("cesta_bono").notNull().default(0),
  status: text("status").notNull().default("activo"),
});

// ─── TASAS BCV Y BANCO CENTRAL ────────────────────────────────────────────────
export const tasas = sqliteTable("tasas", {
    id: text("id").primaryKey(),
    tasaBcv: real("tasa_bcv").notNull(),
    tasaPrestaciones: real("tasa_prestaciones").notNull(),
    fecha: text("fecha").notNull(),
});

// ─── PERIODOS DE NÓMINA ──────────────────────────────────────────────────────
export const periodosNomina = sqliteTable("periodos_nomina", {
  id: text("id").primaryKey(),
  empresaId: text("empresa_id").notNull().references(() => empresas.id),
  tipo: text("tipo").notNull(),
  anio: integer("anio").notNull(),
  mes: integer("mes").notNull(),
  quincena: integer("quincena"),
  fechaInicio: text("fecha_inicio").notNull(),
  fechaFin: text("fecha_fin").notNull(),
  status: text("status").notNull().default("abierto"),
  creadoEn: integer("creado_en", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ─── RECIBOS DE PAGO ─────────────────────────────────────────────────────────
export const recibosPago = sqliteTable("recibos_pago", {
  id: text("id").primaryKey(),
  empresaId: text("empresa_id").notNull().references(() => empresas.id),
  periodoId: text("periodo_id").notNull().references(() => periodosNomina.id),
  trabajadorId: text("trabajador_id").notNull().references(() => trabajadores.id),
  salarioBase: real("salario_base").notNull(),
  diasTrabajados: real("dias_trabajados").notNull().default(30),
  salarioDiario: real("salario_diario").notNull(),
  totalAsignaciones: real("total_asignaciones").notNull(),
  ivssObrero: real("ivss_obrero").notNull().default(0),
  rpeObrero: real("rpe_obrero").notNull().default(0),
  lphObrero: real("lph_obrero").notNull().default(0),
  islrRetenido: real("islr_retenido").notNull().default(0),
  otrasDeduciones: real("otras_deducciones").notNull().default(0),
  totalDeducciones: real("total_deducciones").notNull(),
  salarioNeto: real("salario_neto").notNull(),
});

// ─── DEDUCCIONES Y APORTES CUSTOM ───────────────────────────────────────────
export const deducciones = sqliteTable("deducciones", {
  id: text("id").primaryKey(),
  empresaId: text("empresa_id").notNull().references(() => empresas.id),
  nombre: text("nombre").notNull(),
  porcentajeObrero: real("porcentaje_obrero").notNull(),
  porcentajePatronal: real("porcentaje_patronal").notNull().default(0),
  aplicaAportePatronal: integer("aplica_aporte_patronal", { mode: "boolean" }).notNull().default(false),
});

export const aportes = sqliteTable("aportes", {
  id: text("id").primaryKey(),
  empresaId: text("empresa_id").notNull().references(() => empresas.id),
  periodoId: text("periodo_id").notNull().references(() => periodosNomina.id),
  trabajadorId: text("trabajador_id").notNull().references(() => trabajadores.id),
  ivss: real("ivss").notNull(),
  rpe: real("rpe").notNull(),
  faov: real("faov").notNull(),
  inces: real("inces").notNull(),
  cepp: real("cepp").notNull(),
  otras: real("otras").notNull(),
});

// ─── VACACIONES ──────────────────────────────────────────────────────────────
export const vacaciones = sqliteTable("vacaciones", {
  id: text("id").primaryKey(),
  empresaId: text("empresa_id").notNull().references(() => empresas.id),
  trabajadorId: text("trabajador_id").notNull().references(() => trabajadores.id),
  periodo: text("periodo").notNull(),
  diasDisfrutados: integer("dias_disfrutados").notNull(),
  fechaSalida: text("fecha_salida").notNull(),
  fechaRetorno: text("fecha_retorno").notNull(),
});

// ─── TYPES ───────────────────────────────────────────────────────────────────
export type Empresa = typeof empresas.$inferSelect;
export type Usuario = typeof usuarios.$inferSelect;
export type Cargo = typeof cargos.$inferSelect;
export type CentroCosto = typeof centrosCosto.$inferSelect;
export type Trabajador = typeof trabajadores.$inferSelect;
export type Tasa = typeof tasas.$inferSelect;
export type PeriodoNomina = typeof periodosNomina.$inferSelect;
export type ReciboPago = typeof recibosPago.$inferSelect;
export type NuevoReciboPago = typeof recibosPago.$inferInsert;
export type Deduccion = typeof deducciones.$inferSelect;
export type Aporte = typeof aportes.$inferSelect;
export type Vacacion = typeof vacaciones.$inferSelect;
