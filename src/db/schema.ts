import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";

// ─── EMPRESAS (TENANTS) ──────────────────────────────────────────────────────
export const empresas = sqliteTable("empresas", {
  id: text("id").primaryKey(), // UUID
  rif: text("rif").notNull().unique(),
  razonSocial: text("razon_social").notNull(),
  nombreComercial: text("nombre_comercial"),
  direccion: text("direccion"),
  telefono: text("telefono"),
  email: text("email"),
  // Parámetros IVSS configurables por empresa
  ivssPatronal: real("ivss_patronal").notNull().default(9), // 9-11%
  ivssObrero: real("ivss_obrero").notNull().default(4),
  // RPE (Régimen Prestacional de Empleo)
  rpePatronal: real("rpe_patronal").notNull().default(2),
  rpeObrero: real("rpe_obrero").notNull().default(0.5),
  // LPH (Ley de Política Habitacional)
  lphPatronal: real("lph_patronal").notNull().default(2),
  lphObrero: real("lph_obrero").notNull().default(1),
  // Configuración de nómina
  periodicidadNomina: text("periodicidad_nomina").notNull().default("mensual"), // mensual | quincenal | semanal
  diasHabilesSemanales: integer("dias_habiles_semanales").notNull().default(5),
  // Configuración LOTTT
  diasUtilidades: integer("dias_utilidades").notNull().default(15), // mínimo 15, configurable
  // Estado de licencia
  licenciaStatus: text("licencia_status").notNull().default("trial"), // trial | activa | suspendida | vencida
  licenciaExpira: text("licencia_expira"),
  planLicencia: text("plan_licencia").notNull().default("basico"), // basico | profesional | empresarial
  // Onboarding
  onboardingCompleto: integer("onboarding_completo", { mode: "boolean" }).notNull().default(false),
  onboardingPaso: integer("onboarding_paso").notNull().default(1),
  // Auditoría
  creadoEn: text("creado_en").notNull().default(sql`(datetime('now'))`),
  actualizadoEn: text("actualizado_en").notNull().default(sql`(datetime('now'))`),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
});

// ─── CENTROS DE COSTO ────────────────────────────────────────────────────────
export const centrosCosto = sqliteTable(
  "centros_costo",
  {
    id: text("id").primaryKey(),
    empresaId: text("empresa_id").notNull().references(() => empresas.id),
    codigo: text("codigo").notNull(),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion"),
    activo: integer("activo", { mode: "boolean" }).notNull().default(true),
    creadoEn: text("creado_en").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("idx_centros_empresa").on(t.empresaId)]
);

// ─── CARGOS / PUESTOS ────────────────────────────────────────────────────────
export const cargos = sqliteTable(
  "cargos",
  {
    id: text("id").primaryKey(),
    empresaId: text("empresa_id").notNull().references(() => empresas.id),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion"),
    nivel: text("nivel"), // operativo | técnico | profesional | gerencial
    activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [index("idx_cargos_empresa").on(t.empresaId)]
);

// ─── USUARIOS ────────────────────────────────────────────────────────────────
export const usuarios = sqliteTable(
  "usuarios",
  {
    id: text("id").primaryKey(),
    empresaId: text("empresa_id").references(() => empresas.id), // NULL para rol master
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    nombre: text("nombre").notNull(),
    apellido: text("apellido").notNull(),
    cedula: text("cedula"),
    telefono: text("telefono"),
    rol: text("rol").notNull(), // master | admin | analista | trabajador
    activo: integer("activo", { mode: "boolean" }).notNull().default(true),
    primerLogin: integer("primer_login", { mode: "boolean" }).notNull().default(true),
    creadoEn: text("creado_en").notNull().default(sql`(datetime('now'))`),
    ultimoAcceso: text("ultimo_acceso"),
  },
  (t) => [index("idx_usuarios_empresa").on(t.empresaId)]
);

// ─── TRABAJADORES ────────────────────────────────────────────────────────────
export const trabajadores = sqliteTable(
  "trabajadores",
  {
    id: text("id").primaryKey(),
    empresaId: text("empresa_id").notNull().references(() => empresas.id),
    usuarioId: text("usuario_id").references(() => usuarios.id),
    // Datos personales
    cedula: text("cedula").notNull(),
    nombre: text("nombre").notNull(),
    apellido: text("apellido").notNull(),
    fechaNacimiento: text("fecha_nacimiento"),
    sexo: text("sexo"), // M | F
    estadoCivil: text("estado_civil"),
    numeroCuentaBancaria: text("numero_cuenta_bancaria"),
    banco: text("banco"),
    // Datos laborales
    cargoId: text("cargo_id").references(() => cargos.id),
    centroCostoId: text("centro_costo_id").references(() => centrosCosto.id),
    fechaIngreso: text("fecha_ingreso").notNull(),
    fechaEgreso: text("fecha_egreso"),
    motivoEgreso: text("motivo_egreso"), // renuncia | despido | jubilacion | otro
    tipoContrato: text("tipo_contrato").notNull().default("tiempo_indeterminado"),
    // Salario
    salarioBase: real("salario_base").notNull(),
    monedaSalario: text("moneda_salario").notNull().default("VES"), // VES | USD
    // IVSS
    nssIvss: text("nss_ivss"),
    ivssRiesgo: real("ivss_riesgo"), // Porcentaje de riesgo: 9%, 10% o 11% (sobreescribe empresa)
    // Cesta Ticket
    cestaBono: real("cesta_bono").notNull().default(0),
    // Estado
    status: text("status").notNull().default("activo"), // activo | inactivo | egresado | suspendido
    creadoEn: text("creado_en").notNull().default(sql`(datetime('now'))`),
    actualizadoEn: text("actualizado_en").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [
    index("idx_trabajadores_empresa").on(t.empresaId),
    index("idx_trabajadores_cedula_empresa").on(t.cedula, t.empresaId),
  ]
);

// ─── TASAS BCV Y BANCO CENTRAL ────────────────────────────────────────────────
export const tasas = sqliteTable("tasas", {
  id: text("id").primaryKey(),
  tipo: text("tipo").notNull(), // bcv_usd_ves | tasa_activa_bcv | tasa_pasiva_bcv
  valor: real("valor").notNull(),
  fechaVigencia: text("fecha_vigencia").notNull(),
  fuente: text("fuente"), // api_bcv | scraping | manual
  urlFuente: text("url_fuente"),
  creadoEn: text("creado_en").notNull().default(sql`(datetime('now'))`),
  creadoPor: text("creado_por"),
});

// ─── PERIODOS DE NÓMINA ──────────────────────────────────────────────────────
export const periodosNomina = sqliteTable(
  "periodos_nomina",
  {
    id: text("id").primaryKey(),
    empresaId: text("empresa_id").notNull().references(() => empresas.id),
    tipo: text("tipo").notNull(), // mensual | quincenal | semanal
    anio: integer("anio").notNull(),
    mes: integer("mes").notNull(),
    quincena: integer("quincena"), // 1 o 2 para quincenal
    semana: integer("semana"), // para semanal
    fechaInicio: text("fecha_inicio").notNull(),
    fechaFin: text("fecha_fin").notNull(),
    status: text("status").notNull().default("borrador"), // borrador | calculada | aprobada | pagada
    tasaBcvId: text("tasa_bcv_id").references(() => tasas.id),
    aprobadoPor: text("aprobado_por"),
    aprobadoEn: text("aprobado_en"),
    creadoEn: text("creado_en").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("idx_periodos_empresa").on(t.empresaId)]
);

// ─── RECIBOS DE PAGO ─────────────────────────────────────────────────────────
export const recibosPago = sqliteTable(
  "recibos_pago",
  {
    id: text("id").primaryKey(),
    empresaId: text("empresa_id").notNull().references(() => empresas.id),
    periodoId: text("periodo_id").notNull().references(() => periodosNomina.id),
    trabajadorId: text("trabajador_id").notNull().references(() => trabajadores.id),
    // Salario
    salarioBase: real("salario_base").notNull(),
    diasTrabajados: real("dias_trabajados").notNull().default(30),
    salarioDiario: real("salario_diario").notNull(),
    // Asignaciones
    cestaBono: real("cesta_bono").notNull().default(0),
    bonoTransporte: real("bono_transporte").notNull().default(0),
    bonoAlimentacion: real("bono_alimentacion").notNull().default(0),
    otrasAsignaciones: real("otras_asignaciones").notNull().default(0),
    horasExtrasMonto: real("horas_extras_monto").notNull().default(0),
    totalAsignaciones: real("total_asignaciones").notNull(),
    // Deducciones
    ivssObrero: real("ivss_obrero").notNull().default(0),
    rpeObrero: real("rpe_obrero").notNull().default(0),
    lphObrero: real("lph_obrero").notNull().default(0),
    contribucionPensiones: real("contribucion_pensiones").notNull().default(0), // 9% CEPP
    adelantoQuincena: real("adelanto_quincena").notNull().default(0),
    otrasDeduciones: real("otras_deducciones").notNull().default(0),
    totalDeducciones: real("total_deducciones").notNull(),
    // Totales
    salarioNeto: real("salario_neto").notNull(),
    // Tasa BCV aplicada
    tasaBcv: real("tasa_bcv"),
    salarioNetoUsd: real("salario_neto_usd"),
    // Estado
    status: text("status").notNull().default("calculado"), // calculado | aprobado | pagado
    creadoEn: text("creado_en").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [
    index("idx_recibos_empresa").on(t.empresaId),
    index("idx_recibos_trabajador").on(t.trabajadorId),
    index("idx_recibos_periodo").on(t.periodoId),
  ]
);

// ─── HORAS EXTRAS ────────────────────────────────────────────────────────────
export const horasExtras = sqliteTable(
  "horas_extras",
  {
    id: text("id").primaryKey(),
    empresaId: text("empresa_id").notNull().references(() => empresas.id),
    trabajadorId: text("trabajador_id").notNull().references(() => trabajadores.id),
    periodoId: text("periodo_id").references(() => periodosNomina.id),
    fecha: text("fecha").notNull(),
    tipoHora: text("tipo_hora").notNull(), // diurna | nocturna | diurna_feriado | nocturna_feriado
    cantidadHoras: real("cantidad_horas").notNull(),
    recargo: real("recargo").notNull(), // porcentaje
    montoPagado: real("monto_pagado"),
    aprobado: integer("aprobado", { mode: "boolean" }).notNull().default(false),
    aprobadoPor: text("aprobado_por"),
    creadoEn: text("creado_en").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("idx_horas_empresa").on(t.empresaId)]
);

// ─── PRESTACIONES SOCIALES ───────────────────────────────────────────────────
export const prestacionesSociales = sqliteTable(
  "prestaciones_sociales",
  {
    id: text("id").primaryKey(),
    empresaId: text("empresa_id").notNull().references(() => empresas.id),
    trabajadorId: text("trabajador_id").notNull().references(() => trabajadores.id),
    anio: integer("anio").notNull(),
    trimestre: integer("trimestre").notNull(), // 1-4
    // Garantía (Artículo 142 LOTTT)
    salarioDiarioIntegral: real("salario_diario_integral").notNull(),
    diasGarantia: real("dias_garantia").notNull().default(15), // 15 días por trimestre (mínimo)
    montoGarantia: real("monto_garantia").notNull(),
    interesesGarantia: real("intereses_garantia").notNull().default(0),
    tasaInteresAplicada: real("tasa_interes_aplicada"),
    // Retroactividad (Artículo 142 b LOTTT: 30 días por año)
    diasRetroactividad: real("dias_retroactividad").notNull().default(0),
    montoRetroactividad: real("monto_retroactividad").notNull().default(0),
    // Resultado doble vía
    montoFinal: real("monto_final").notNull(), // max(garantia+intereses, retroactividad)
    viaAplicada: text("via_aplicada").notNull(), // garantia | retroactividad
    // Auditoría
    tasaBcvId: text("tasa_bcv_id").references(() => tasas.id),
    creadoEn: text("creado_en").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [
    index("idx_prestaciones_empresa").on(t.empresaId),
    index("idx_prestaciones_trabajador").on(t.trabajadorId),
  ]
);

// ─── VACACIONES ──────────────────────────────────────────────────────────────
export const vacaciones = sqliteTable(
  "vacaciones",
  {
    id: text("id").primaryKey(),
    empresaId: text("empresa_id").notNull().references(() => empresas.id),
    trabajadorId: text("trabajador_id").notNull().references(() => trabajadores.id),
    anioServicio: integer("anio_servicio").notNull(),
    diasVacaciones: real("dias_vacaciones").notNull(), // 15 + 1 por año
    diasBonoVacacional: real("dias_bono_vacacional").notNull(), // 7 + 1 por año (mínimo LOTTT)
    fechaInicio: text("fecha_inicio"),
    fechaFin: text("fecha_fin"),
    salarioDiario: real("salario_diario").notNull(),
    montoVacaciones: real("monto_vacaciones").notNull(),
    montoBonoVacacional: real("monto_bono_vacacional").notNull(),
    montoTotal: real("monto_total").notNull(),
    status: text("status").notNull().default("pendiente"), // pendiente | aprobadas | disfrutadas | pagadas
    aprobadoPor: text("aprobado_por"),
    creadoEn: text("creado_en").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("idx_vacaciones_empresa").on(t.empresaId)]
);

// ─── UTILIDADES ──────────────────────────────────────────────────────────────
export const utilidades = sqliteTable(
  "utilidades",
  {
    id: text("id").primaryKey(),
    empresaId: text("empresa_id").notNull().references(() => empresas.id),
    trabajadorId: text("trabajador_id").notNull().references(() => trabajadores.id),
    anio: integer("anio").notNull(),
    diasUtilidades: real("dias_utilidades").notNull(), // configurable por empresa
    salarioPromedio: real("salario_promedio").notNull(),
    montoUtilidades: real("monto_utilidades").notNull(),
    diasTrabajados: real("dias_trabajados").notNull(), // para prorrateo
    status: text("status").notNull().default("pendiente"),
    creadoEn: text("creado_en").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("idx_utilidades_empresa").on(t.empresaId)]
);

// ─── PAGOS DE LICENCIAS ──────────────────────────────────────────────────────
export const pagosLicencias = sqliteTable(
  "pagos_licencias",
  {
    id: text("id").primaryKey(),
    empresaId: text("empresa_id").notNull().references(() => empresas.id),
    metodoPago: text("metodo_pago").notNull(), // binance | zinli | pago_movil | banesco_panama
    referencia: text("referencia").notNull(),
    monto: real("monto").notNull(),
    moneda: text("moneda").notNull(), // USD | VES | USDT
    fechaPago: text("fecha_pago").notNull(),
    planSolicitado: text("plan_solicitado").notNull(),
    mesesSolicitados: integer("meses_solicitados").notNull().default(1),
    status: text("status").notNull().default("pendiente"), // pendiente | verificado | rechazado
    verificadoPor: text("verificado_por"),
    verificadoEn: text("verificado_en"),
    notas: text("notas"),
    comprobante: text("comprobante"), // base64 o URL
    creadoEn: text("creado_en").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("idx_pagos_empresa").on(t.empresaId)]
);

// ─── LOG DE AUDITORÍA ────────────────────────────────────────────────────────
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    empresaId: text("empresa_id").references(() => empresas.id),
    usuarioId: text("usuario_id").references(() => usuarios.id),
    accion: text("accion").notNull(),
    tabla: text("tabla"),
    registroId: text("registro_id"),
    datosAnteriores: text("datos_anteriores"), // JSON
    datosNuevos: text("datos_nuevos"), // JSON
    ip: text("ip"),
    userAgent: text("user_agent"),
    creadoEn: text("creado_en").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [
    index("idx_audit_empresa").on(t.empresaId),
    index("idx_audit_usuario").on(t.usuarioId),
  ]
);

// ─── CONTRIBUCION ESPECIAL PENSIONES (CEPP) ──────────────────────────────────
export const contribucionesPensiones = sqliteTable(
  "contribuciones_pensiones",
  {
    id: text("id").primaryKey(),
    empresaId: text("empresa_id").notNull().references(() => empresas.id),
    trabajadorId: text("trabajador_id").notNull().references(() => trabajadores.id),
    periodoId: text("periodo_id").notNull().references(() => periodosNomina.id),
    baseCalculo: real("base_calculo").notNull(), // salario base indexado BCV mínimo
    porcentaje: real("porcentaje").notNull().default(9),
    monto: real("monto").notNull(),
    tasaBcvAplicada: real("tasa_bcv_aplicada"),
    creadoEn: text("creado_en").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("idx_cepp_empresa").on(t.empresaId)]
);

// Types
export type Empresa = typeof empresas.$inferSelect;
export type NuevaEmpresa = typeof empresas.$inferInsert;
export type Usuario = typeof usuarios.$inferSelect;
export type NuevoUsuario = typeof usuarios.$inferInsert;
export type Trabajador = typeof trabajadores.$inferSelect;
export type NuevoTrabajador = typeof trabajadores.$inferInsert;
export type Tasa = typeof tasas.$inferSelect;
export type NuevaTasa = typeof tasas.$inferInsert;
export type PeriodoNomina = typeof periodosNomina.$inferSelect;
export type ReciboPago = typeof recibosPago.$inferSelect;
export type PrestacionSocial = typeof prestacionesSociales.$inferSelect;
export type Vacacion = typeof vacaciones.$inferSelect;
export type Utilidad = typeof utilidades.$inferSelect;
export type PagoLicencia = typeof pagosLicencias.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
