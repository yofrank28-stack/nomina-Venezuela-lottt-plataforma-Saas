
import type { ReciboProcesado } from "@/lib/nomina";
import type { ReciboPago, Trabajador, Empresa, PeriodoNomina, Vacacion, Tasa, Cargo, CentroCosto } from "@/db/schema";
import { calcularVacaciones, calcularSalarioIntegral } from "@/lib/lottt";
import { db } from '@/db';
import { periodosNomina } from '@/db/schema';
import { eq } from 'drizzle-orm';

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => (n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => d.split('-').reverse().join('/');

// ─── FORMATO TIUNA (IVSS) ─────────────────────────────────────────────────────
export function generarArchivoTiuna(trabajadores: (Trabajador & { cargo: Cargo | null })[]): string {
  return trabajadores.map(t => {
    const cedula = t.cedula.replace(/\D/g, '');
    const salarioSemanal = ((t.salarioBase * 12) / 52).toFixed(2);
    const codigoCargo = t.cargo?.id.toString().padStart(4, '0') || '0000';

    return [
      cedula,
      t.apellido.toUpperCase(),
      t.nombre.toUpperCase(),
      fmtDate(t.fechaIngreso),
      salarioSemanal,
      'N/A', 
      codigoCargo
    ].join(',');
  }).join('\r\n');
}

// ─── FORMATO XML ISLR (SENIAT) ────────────────────────────────────────────────
export function generarXmlIslr(params: {
  empresa: Empresa;
  recibos: (ReciboProcesado & { trabajador: Trabajador })[];
  periodo: PeriodoNomina;
}): string {
  const { empresa, recibos, periodo } = params;
  const periodoAnioMes = `${periodo.anio}${String(periodo.mes).padStart(2, '0')}`;

  const detalles = recibos.map(r => `
    <DetalleRetencion>
      <RifRetenido>${r.trabajador.cedula}</RifRetenido>
      <NumeroFactura>0</NumeroFactura>
      <NumeroControl>0</NumeroControl>
      <FechaOperacion>${periodo.fechaFin}</FechaOperacion>
      <CodigoConcepto>001</CodigoConcepto>
      <MontoOperacion>${r.totalAsignaciones.toFixed(2)}</MontoOperacion>
      <PorcentajeRetencion>0</PorcentajeRetencion>
      <MontoRetenido>${r.islrRetenido.toFixed(2)}</MontoRetenido>
    </DetalleRetencion>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<RelacionRetencionesISLR>
  <Cabecera>
    <RifAgente>${empresa.rif}</RifAgente>
    <PeriodoImpositivo>${periodoAnioMes}</PeriodoImpositivo>
  </Cabecera>${detalles}
</RelacionRetencionesISLR>`;
}

// ─── REPORTE DE ASIENTO CONTABLE (ADMIN) ───────────────────────────────────
export function generarAsientoContable(params: {
  recibos: ReciboProcesado[];
  empresa: Empresa;
  periodo: PeriodoNomina;
  tasa: Tasa;
}): string {
  const { recibos, empresa, periodo, tasa } = params;
  
  let gastoTotalSueldos = 0;
  let gastoTotalAportes = 0;
  let retencionesTotales = 0;
  let netoAPagar = 0;

  const aportes = { ivss: 0, rpe: 0, faov: 0, inces: 0, cepp: 0 };
  const retenciones = { ivss: 0, rpe: 0, faov: 0, islr: 0 };

  for (const r of recibos) {
    gastoTotalSueldos += r.totalAsignaciones;
    netoAPagar += r.salarioNeto;

    retenciones.ivss += r.ivssObrero;
    retenciones.rpe += r.rpeObrero;
    retenciones.faov += r.lphObrero;
    retenciones.islr += r.islrRetenido;

    aportes.ivss += r.contribucionesPatronales.ivss;
    aportes.rpe += r.contribucionesPatronales.rpe;
    aportes.faov += r.contribucionesPatronales.faov;
    aportes.inces += r.contribucionesPatronales.inces;
    aportes.cepp += r.contribucionesPatronales.cepp;
  }

  gastoTotalAportes = Object.values(aportes).reduce((a, b) => a + b, 0);
  retencionesTotales = Object.values(retenciones).reduce((a, b) => a + b, 0);

  const provisionGarantia = gastoTotalSueldos / 12; 
  const provisionIntereses = provisionGarantia * (tasa.tasaPrestaciones / 100);
  const provisionUtilidades = gastoTotalSueldos * (empresa.diasUtilidades / 360);

  const totalDebe = gastoTotalSueldos + gastoTotalAportes + provisionGarantia + provisionIntereses + provisionUtilidades;
  const totalHaber = retencionesTotales + netoAPagar + gastoTotalAportes + provisionGarantia + provisionIntereses + provisionUtilidades;

  return `<!DOCTYPE html>
<html>
<body>
  <h2>Asiento Contable</h2>
  <table>
    <thead><tr><th>Cuentas</th><th>Debe</th><th>Haber</th></tr></thead>
    <tbody>
      <tr><td>- GASTOS -</td><td></td><td></td></tr>
      <tr><td>Sueldos y Salarios</td><td class="text-right">${fmt(gastoTotalSueldos)}</td><td></td></tr>
      <tr><td>Aporte IVSS</td><td class="text-right">${fmt(aportes.ivss)}</td><td></td></tr>
      <tr><td>Aporte FAOV</td><td class="text-right">${fmt(aportes.faov)}</td><td></td></tr>
      <tr><td>Aporte Ley de Pensiones (9%)</td><td class="text-right">${fmt(aportes.cepp)}</td><td></td></tr>
      <tr><td>- PROVISIONES -</td><td></td><td></td></tr>
      <tr><td>Provisión Garantía Prestaciones</td><td class="text-right">${fmt(provisionGarantia)}</td><td></td></tr>
      <tr><td>Provisión Intereses Prestaciones (BCV)</td><td class="text-right">${fmt(provisionIntereses)}</td><td></td></tr>
      <tr><td>- PASIVOS -</td><td></td><td></td></tr>
      <tr><td>Retenciones IVSS (4%)</td><td></td><td class="text-right">${fmt(retenciones.ivss)}</td></tr>
      <tr><td>Retenciones RPE (0.5%)</td><td></td><td class="text-right">${fmt(retenciones.rpe)}</td></tr>
      <tr><td>Retenciones FAOV (1%)</td><td></td><td class="text-right">${fmt(retenciones.faov)}</td></tr>
      <tr><td>Nómina por Pagar</td><td></td><td class="text-right">${fmt(netoAPagar)}</td></tr>
    </tbody>
    <tfoot>
      <tr class="total-row"><td>SUMAS IGUALES</td><td class="text-right">${fmt(totalDebe)}</td><td class="text-right">${fmt(totalHaber)}</td></tr>
    </tfoot>
  </table>
</body>
</html>`;
}

// ─── LIBRO DE SUELDOS Y SALARIOS ──────────────────────────────────────────
export function generarLibroSueldos(params: {
  recibos: (ReciboProcesado & { trabajador: Trabajador })[];
  empresa: Empresa;
  periodo: PeriodoNomina;
}): string {
  const { recibos, empresa, periodo } = params;
  
  let totalSueldos = 0;
  let totalHorasExtras = 0;
  let totalBonos = 0;
  let totalDeducciones = 0;
  let totalNeto = 0;
  let totalAportesPatronales = 0;
  
  const rows = recibos.map(r => {
    const sueldo = r.salarioBase;
    const horasExtras = 0; // TODO: Implementar horas extras
    const bonos = r.totalAsignaciones - sueldo - horasExtras;
    const deducciones = r.totalDeducciones;
    const neto = r.salarioNeto;

    totalSueldos += sueldo;
    totalHorasExtras += horasExtras;
    totalBonos += bonos;
    totalDeducciones += deducciones;
    totalNeto += neto;
    totalAportesPatronales += Object.values(r.contribucionesPatronales).reduce((a, b) => a + b, 0);

    return `
      <tr>
        <td>${r.trabajador.nombre} ${r.trabajador.apellido}</td>
        <td>${r.trabajador.cedula}</td>
        <td>${fmtDate(r.trabajador.fechaIngreso)}</td>
        <td class="text-right">${fmt(sueldo)}</td>
        <td class="text-right">${fmt(horasExtras)}</td>
        <td class="text-right">${fmt(bonos)}</td>
        <td class="text-right">${fmt(r.ivssObrero)}</td>
        <td class="text-right">${fmt(r.rpeObrero)}</td>
        <td class="text-right">${fmt(r.lphObrero)}</td>
        <td class="text-right">${fmt(r.islrRetenido)}</td>
        <td class="text-right">${fmt(neto)}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background-color: #f2f2f2; }
    .text-right { text-align: right; }
    .total-row { font-weight: bold; }
  </style>
</head>
<body>
  <h2>Libro de Sueldos y Salarios</h2>
  <p>${empresa.razonSocial} (RIF: ${empresa.rif})</p>
  <p>Período: ${periodo.mes}/${periodo.anio}</p>
  <table>
    <thead>
      <tr>
        <th>Nombres</th>
        <th>Cédula</th>
        <th>Fecha de Ingreso</th>
        <th>Salario Básico</th>
        <th>Horas Extras</th>
        <th>Bonos</th>
        <th>IVSS</th>
        <th>RPE</th>
        <th>FAOV</th>
        <th>ISLR</th>
        <th>Neto Recibido</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3">Totales</td>
        <td class="text-right">${fmt(totalSueldos)}</td>
        <td class="text-right">${fmt(totalHorasExtras)}</td>
        <td class="text-right">${fmt(totalBonos)}</td>
        <td colspan="3" class="text-right">${fmt(totalDeducciones)}</td>
        <td class="text-right">${fmt(totalNeto)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="10">Total Aportes Patronales (IVSS, RPE, FAOV, INCES, LOPCYMAT, CEPP 9%)</td>
        <td class="text-right">${fmt(totalAportesPatronales)}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
}

// ─── LIBRO DE VACACIONES ──────────────────────────────────────────────────
export function generarLibroVacaciones(trabajadores: (Trabajador & { vacaciones: Vacacion[] })[]): string {
  const rows = trabajadores.map(t => {
    const aniosServicio = new Date().getFullYear() - new Date(t.fechaIngreso).getFullYear();
    const { diasVacaciones, diasBonoVacacional, montoBonoVacacional } = calcularVacaciones({ aniosServicio, salarioDiario: t.salarioBase / 30 });
    const diasDisfrutados = t.vacaciones.reduce((acc, v) => acc + v.diasDisfrutados, 0);
    const diasPendientes = diasVacaciones - diasDisfrutados;
    
    const { salarioDiarioIntegral } = calcularSalarioIntegral(t.salarioBase, 15, aniosServicio); // Assuming 15 utilidades days
    const pagoBonoVacacional = salarioDiarioIntegral * diasBonoVacacional;

    return `
      <tr>
        <td>${t.apellido}, ${t.nombre}</td>
        <td>${t.cedula}</td>
        <td>${fmtDate(t.fechaIngreso)}</td>
        <td>${aniosServicio}</td>
        <td>${diasVacaciones}</td>
        <td>${diasDisfrutados}</td>
        <td>${diasPendientes}</td>
        <td class="text-right">${fmt(pagoBonoVacacional)}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background-color: #f2f2f2; }
    .text-right { text-align: right; }
  </style>
</head>
<body>
  <h2>Libro de Vacaciones</h2>
  <table>
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Cédula</th>
        <th>Ingreso</th>
        <th>Años de Servicio</th>
        <th>Días de Vacaciones</th>
        <th>Días Disfrutados</th>
        <th>Días Pendientes</th>
        <th>Pago Bono Vacacional</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

// ─── CIERRE DE MES ──────────────────────────────────────────────────────────
export async function cerrarMes(periodoId: string) {
  await db.update(periodosNomina).set({ status: 'cerrado' }).where(eq(periodosNomina.id, periodoId));
}
