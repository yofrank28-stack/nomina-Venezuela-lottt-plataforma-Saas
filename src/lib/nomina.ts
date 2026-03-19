import { db } from '@/db';
import { empresas, trabajadores, periodosNomina, recibosPago, deducciones, aportes, cargos, centrosCosto } from '@/db/schema';
import type { Empresa, Trabajador, PeriodoNomina, NuevoReciboPago, Deduccion, Aporte, Cargo, CentroCosto } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const SALARIO_MINIMO_VES = 130; // Hardcoded, should be configurable

//─── UTILS ────────────────────────────────────────────────────────────────────
export function getMondaysInRange(startDateStr: string, endDateStr: string): number {
  let mondays = 0;
  const startDate = new Date(`${startDateStr}T00:00:00Z`);
  const endDate = new Date(`${endDateStr}T00:00:00Z`);
  let current = new Date(startDate);
  while (current <= endDate) {
    if (current.getUTCDay() === 1) {
      mondays++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return mondays;
}

//─── CÁLCULO DE CONTRIBUCIONES ────────────────────────────────────────────────

export interface Contribuciones {
  ivssObrero: number;
  ivssPatronal: number;
  rpeObrero: number;
  rpePatronal: number;
  faovObrero: number;
  faovPatronal: number;
  incesPatronal: number;
  ceppPatronal: number;
  otrasDeducciones: number;
  otrosAportesPatronales: number;
  islrRetenido: number;
}

export function calcularContribuciones(
  salarioBase: number,
  salarioIntegral: number,
  empresa: Empresa,
  mondays: number,
  deduccionesCustom: Deduccion[]
): Contribuciones {
  const baseSemanal = (salarioBase * 12) / 52;
  const topeIvssSemanal = (SALARIO_MINIMO_VES * 5 * 12) / 52;
  const baseIvssCap = Math.min(baseSemanal, topeIvssSemanal);
  const baseIvssMensual = baseIvssCap * mondays;

  const topeFaovMensual = SALARIO_MINIMO_VES * 10;
  const baseFaovCap = Math.min(salarioIntegral, topeFaovMensual);

  let otrasDeducciones = 0;
  let otrosAportesPatronales = 0;

  for (const d of deduccionesCustom) {
    const montoDeduccion = salarioBase * (d.porcentajeObrero / 100);
    otrasDeducciones += montoDeduccion;
    if (d.aplicaAportePatronal) {
      otrosAportesPatronales += salarioBase * (d.porcentajePatronal / 100);
    }
  }

  const islrRetenido = salarioIntegral > SALARIO_MINIMO_VES * 10 ? (salarioIntegral - (SALARIO_MINIMO_VES * 10)) * 0.1 : 0;

  return {
    ivssObrero: baseIvssMensual * (empresa.ivssObrero / 100),
    ivssPatronal: baseIvssMensual * (empresa.ivssPatronal / 100),
    rpeObrero: baseIvssMensual * (empresa.rpeObrero / 100),
    rpePatronal: baseIvssMensual * (empresa.rpePatronal / 100),
    faovObrero: baseFaovCap * (empresa.lphObrero / 100),
    faovPatronal: baseFaovCap * (empresa.lphPatronal / 100),
    incesPatronal: salarioIntegral * 0.02,
    ceppPatronal: Math.max(salarioIntegral, SALARIO_MINIMO_VES) * 0.09,
    otrasDeducciones,
    otrosAportesPatronales,
    islrRetenido,
  };
}

//─── PROCESAMIENTO DE NÓMINA ──────────────────────────────────────────────────

export interface ReciboProcesado {
  id: string;
  empresaId: string;
  periodoId: string;
  trabajadorId: string;
  salarioBase: number;
  diasTrabajados: number;
  salarioDiario: number;
  totalAsignaciones: number;
  ivssObrero: number;
  rpeObrero: number;
  lphObrero: number;
  islrRetenido: number;
  otrasDeduciones: number;
  totalDeducciones: number;
  salarioNeto: number;
  contribucionesPatronales: {
    ivss: number;
    rpe: number;
    faov: number;
    inces: number;
    cepp: number;
    otras: number;
  };
}

async function procesarTrabajador(
  trabajador: Trabajador,
  periodo: PeriodoNomina,
  empresa: Empresa,
  deduccionesCustom: Deduccion[]
): Promise<ReciboProcesado> {
  const salarioBase: number = trabajador.salarioBase || 0;
  const otrasAsignaciones: number = (trabajador.cestaBono || 0);
  const salarioIntegral: number = salarioBase + otrasAsignaciones;

  const mondays = getMondaysInRange(periodo.fechaInicio, periodo.fechaFin);
  const contrib = calcularContribuciones(salarioBase, salarioIntegral, empresa, mondays, deduccionesCustom);

  const totalAsignaciones: number = salarioIntegral;
  const totalDeducciones: number = contrib.ivssObrero + contrib.rpeObrero + contrib.faovObrero + contrib.otrasDeducciones + contrib.islrRetenido;
  const salarioNeto: number = totalAsignaciones - totalDeducciones;

  return {
    id: randomUUID(),
    empresaId: empresa.id,
    periodoId: periodo.id,
    trabajadorId: trabajador.id,
    salarioBase: salarioBase,
    diasTrabajados: 15,
    salarioDiario: salarioBase / 30,
    totalAsignaciones: totalAsignaciones,
    ivssObrero: contrib.ivssObrero,
    rpeObrero: contrib.rpeObrero,
    lphObrero: contrib.faovObrero,
    islrRetenido: contrib.islrRetenido,
    otrasDeduciones: contrib.otrasDeducciones,
    totalDeducciones: totalDeducciones,
    salarioNeto: salarioNeto,
    contribucionesPatronales: {
      ivss: contrib.ivssPatronal,
      rpe: contrib.rpePatronal,
      faov: contrib.faovPatronal,
      inces: contrib.incesPatronal,
      cepp: contrib.ceppPatronal,
      otras: contrib.otrosAportesPatronales,
    },
  };
}

//─── ORQUESTACIÓN DE NÓMINA ───────────────────────────────────────────────────

export async function procesarNomina(periodoId: string, empresaId: string): Promise<ReciboProcesado[]> {
  const [periodo] = await db.select().from(periodosNomina).where(eq(periodosNomina.id, periodoId));
  const [empresa] = await db.select().from(empresas).where(eq(empresas.id, empresaId));
  const listaTrabajadores = await db.select().from(trabajadores).where(and(eq(trabajadores.empresaId, empresaId), eq(trabajadores.status, 'activo')));
  const deduccionesCustom = await db.select().from(deducciones).where(eq(deducciones.empresaId, empresaId));

  const recibosProcesados: ReciboProcesado[] = [];
  for (const trabajador of listaTrabajadores) {
    const recibo = await procesarTrabajador(trabajador, periodo, empresa, deduccionesCustom);
    recibosProcesados.push(recibo);
  }

  const nuevosRecibos = recibosProcesados.map(({ contribucionesPatronales, ...recibo }) => recibo);
  
  await db.delete(recibosPago).where(eq(recibosPago.periodoId, periodoId));
  await db.delete(aportes).where(eq(aportes.periodoId, periodoId));
  await db.insert(recibosPago).values(nuevosRecibos as NuevoReciboPago[]);

  const nuevosAportes = recibosProcesados.map(r => ({ id: randomUUID(), ...r.contribucionesPatronales, periodoId, trabajadorId: r.trabajadorId, empresaId }));
  await db.insert(aportes).values(nuevosAportes);

  return recibosProcesados;
}
