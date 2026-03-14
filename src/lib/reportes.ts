/**
 * Generador de reportes ligeros: TXT para bancos y portales gubernamentales
 * PDF se genera en el cliente via window.print() con estilos específicos
 */

import type { ReciboPago, Trabajador, Empresa, PeriodoNomina } from "@/db/schema";

// ─── FORMATO BANESCO/MERCANTIL (ACH) ──────────────────────────────────────────
export interface RegistroACH {
  cedula: string;
  nombre: string;
  banco: string;
  numeroCuenta: string;
  monto: number;
}

export function generarArchivoACH(
  empresa: Empresa,
  registros: RegistroACH[],
  fecha: string,
  banco: "banesco" | "mercantil"
): string {
  const lines: string[] = [];
  const fechaFormato = fecha.replace(/-/g, ""); // YYYYMMDD

  if (banco === "banesco") {
    // Header Banesco
    lines.push(
      `1${empresa.rif.replace(/[-]/g, "").padEnd(11)}${fechaFormato}${"NOMINA".padEnd(20)}${String(registros.length).padStart(6, "0")}`
    );
    for (const reg of registros) {
      const cedula = reg.cedula.replace(/[V-v]/g, "").padStart(9, "0");
      const nombre = reg.nombre.toUpperCase().substring(0, 30).padEnd(30);
      const cuenta = reg.numeroCuenta.padStart(20, "0");
      const monto = Math.round(reg.monto * 100).toString().padStart(15, "0");
      lines.push(`2${cedula}${nombre}${cuenta}${monto}01`);
    }
    // Trailer
    const totalMonto = Math.round(registros.reduce((a, r) => a + r.monto, 0) * 100).toString().padStart(15, "0");
    lines.push(`9${String(registros.length).padStart(6, "0")}${totalMonto}`);
  } else {
    // Mercantil format
    lines.push(
      `HDR${empresa.rif.replace(/[-]/g, "").padEnd(20)}${fechaFormato}NOMINA${String(registros.length).padStart(8, "0")}`
    );
    for (const reg of registros) {
      const cedula = reg.cedula.replace(/[V-v]/g, "").padStart(10, "0");
      const nombre = reg.nombre.toUpperCase().substring(0, 40).padEnd(40);
      const cuenta = reg.numeroCuenta.padStart(20, "0");
      const monto = reg.monto.toFixed(2).padStart(18, "0");
      lines.push(`DET${cedula}${nombre}${cuenta}${monto}`);
    }
    const total = registros.reduce((a, r) => a + r.monto, 0).toFixed(2).padStart(18, "0");
    lines.push(`TRL${String(registros.length).padStart(8, "0")}${total}`);
  }

  return lines.join("\r\n");
}

// ─── FORMATO IVSS / TIUNA ─────────────────────────────────────────────────────
export interface RegistroIVSS {
  nss: string;
  cedula: string;
  nombre: string;
  apellido: string;
  salarioBase: number;
  ivssObrero: number;
  ivssPatronal: number;
  semanasCotizadas: number;
}

export function generarArchivoTIUNA(
  empresa: Empresa,
  registros: RegistroIVSS[],
  anio: number,
  mes: number
): string {
  const lines: string[] = [];
  const periodo = `${anio}${String(mes).padStart(2, "0")}`;

  lines.push(`EMPRESA:${empresa.rif}|${empresa.razonSocial}|PERIODO:${periodo}`);
  lines.push(`RIF|NSS|CEDULA|APELLIDO|NOMBRE|SALARIO|IVSS_OBRERO|IVSS_PATRONAL|SEMANAS`);

  for (const reg of registros) {
    lines.push(
      [
        empresa.rif,
        reg.nss || "0000000000",
        reg.cedula,
        reg.apellido.toUpperCase(),
        reg.nombre.toUpperCase(),
        reg.salarioBase.toFixed(2),
        reg.ivssObrero.toFixed(2),
        reg.ivssPatronal.toFixed(2),
        String(reg.semanasCotizadas),
      ].join("|")
    );
  }

  const totales = registros.reduce(
    (a, r) => ({
      salario: a.salario + r.salarioBase,
      obrero: a.obrero + r.ivssObrero,
      patronal: a.patronal + r.ivssPatronal,
    }),
    { salario: 0, obrero: 0, patronal: 0 }
  );

  lines.push(
    `TOTAL||${registros.length}||||${totales.salario.toFixed(2)}|${totales.obrero.toFixed(2)}|${totales.patronal.toFixed(2)}|`
  );

  return lines.join("\r\n");
}

// ─── FORMATO BANAVIH (LPH) ────────────────────────────────────────────────────
export function generarArchivoBanavih(
  empresa: Empresa,
  registros: Array<{
    cedula: string;
    nombre: string;
    apellido: string;
    salarioBase: number;
    lphObrero: number;
    lphPatronal: number;
  }>,
  anio: number,
  mes: number
): string {
  const lines: string[] = [];
  const periodo = `${anio}${String(mes).padStart(2, "0")}`;

  lines.push(`H|${empresa.rif}|${empresa.razonSocial}|${periodo}|${registros.length}`);
  for (const reg of registros) {
    lines.push(
      `D|${reg.cedula}|${reg.apellido.toUpperCase()}|${reg.nombre.toUpperCase()}|${reg.salarioBase.toFixed(2)}|${reg.lphObrero.toFixed(2)}|${reg.lphPatronal.toFixed(2)}`
    );
  }
  const totalAporte = registros.reduce((a, r) => a + r.lphObrero + r.lphPatronal, 0);
  lines.push(`T|${registros.length}|${totalAporte.toFixed(2)}`);
  return lines.join("\r\n");
}

// ─── LIBRO DE SALARIOS (TXT) ──────────────────────────────────────────────────
export function generarLibroSalarios(
  empresa: Empresa,
  recibos: Array<ReciboPago & { nombre: string; apellido: string; cedula: string }>,
  periodo: PeriodoNomina
): string {
  const lines: string[] = [];
  lines.push(`LIBRO DE SALARIOS - ${empresa.razonSocial}`);
  lines.push(`RIF: ${empresa.rif}`);
  lines.push(`Período: ${periodo.anio}/${String(periodo.mes).padStart(2, "0")} - ${periodo.tipo.toUpperCase()}`);
  lines.push("=".repeat(120));
  lines.push(
    "CEDULA".padEnd(12) +
    "NOMBRE".padEnd(35) +
    "SALARIO BASE".padStart(15) +
    "ASIGNACIONES".padStart(15) +
    "DEDUCCIONES".padStart(15) +
    "NETO".padStart(15) +
    "USD".padStart(12)
  );
  lines.push("-".repeat(120));

  for (const r of recibos) {
    lines.push(
      r.cedula.padEnd(12) +
      `${r.apellido} ${r.nombre}`.substring(0, 34).padEnd(35) +
      r.salarioBase.toFixed(2).padStart(15) +
      r.totalAsignaciones.toFixed(2).padStart(15) +
      r.totalDeducciones.toFixed(2).padStart(15) +
      r.salarioNeto.toFixed(2).padStart(15) +
      (r.salarioNetoUsd || 0).toFixed(2).padStart(12)
    );
  }

  lines.push("=".repeat(120));
  const totales = recibos.reduce(
    (a, r) => ({
      base: a.base + r.salarioBase,
      asig: a.asig + r.totalAsignaciones,
      ded: a.ded + r.totalDeducciones,
      neto: a.neto + r.salarioNeto,
      usd: a.usd + (r.salarioNetoUsd || 0),
    }),
    { base: 0, asig: 0, ded: 0, neto: 0, usd: 0 }
  );
  lines.push(
    `TOTALES (${recibos.length} trabajadores)`.padEnd(47) +
    totales.base.toFixed(2).padStart(15) +
    totales.asig.toFixed(2).padStart(15) +
    totales.ded.toFixed(2).padStart(15) +
    totales.neto.toFixed(2).padStart(15) +
    totales.usd.toFixed(2).padStart(12)
  );

  return lines.join("\r\n");
}

// ─── HTML RECIBO DE PAGO (para window.print()) ────────────────────────────────
export function generarHtmlRecibo(params: {
  empresa: Empresa;
  trabajador: Trabajador & { cargoNombre?: string };
  recibo: ReciboPago;
  periodo: PeriodoNomina;
  tasaBCV: number;
}): string {
  const { empresa, trabajador, recibo, periodo, tasaBCV } = params;
  const fmt = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Recibo de Pago - ${trabajador.nombre} ${trabajador.apellido}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
  .recibo { width: 210mm; margin: 0 auto; padding: 10mm; }
  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
  .header h2 { font-size: 14px; }
  .header p { font-size: 10px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; }
  .info-item { display: flex; gap: 4px; }
  .label { font-weight: bold; min-width: 100px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #333; color: #fff; padding: 3px 6px; text-align: left; font-size: 10px; }
  td { padding: 2px 6px; border-bottom: 1px solid #ddd; }
  .text-right { text-align: right; }
  .total-row td { font-weight: bold; border-top: 2px solid #000; background: #f5f5f5; }
  .firma { display: grid; grid-template-columns: 1fr 1fr; margin-top: 20mm; gap: 20px; }
  .firma-box { text-align: center; border-top: 1px solid #000; padding-top: 4px; }
  .legal-note { font-size: 8px; text-align: center; margin-top: 8px; border-top: 1px dashed #999; padding-top: 4px; }
  @media print { body { print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="recibo">
  <div class="header">
    <h2>${empresa.razonSocial}</h2>
    <p>RIF: ${empresa.rif} | ${empresa.direccion || ""}</p>
    <p>RECIBO DE PAGO - PERÍODO ${periodo.anio}/${String(periodo.mes).padStart(2, "0")}</p>
  </div>
  <div class="info-grid">
    <div class="info-item"><span class="label">Trabajador:</span> ${trabajador.apellido}, ${trabajador.nombre}</div>
    <div class="info-item"><span class="label">Cédula:</span> ${trabajador.cedula}</div>
    <div class="info-item"><span class="label">Cargo:</span> ${trabajador.cargoNombre || "N/A"}</div>
    <div class="info-item"><span class="label">Ingreso:</span> ${trabajador.fechaIngreso}</div>
    <div class="info-item"><span class="label">Días trab.:</span> ${recibo.diasTrabajados}</div>
    <div class="info-item"><span class="label">Tasa BCV:</span> Bs. ${tasaBCV.toFixed(2)}/USD</div>
  </div>
  <table>
    <thead><tr><th colspan="3">ASIGNACIONES</th></tr></thead>
    <tbody>
      <tr><td>Salario Básico</td><td></td><td class="text-right">Bs. ${fmt(recibo.salarioBase)}</td></tr>
      ${recibo.cestaBono > 0 ? `<tr><td>Cesta Ticket / Bono Alimentación</td><td></td><td class="text-right">Bs. ${fmt(recibo.cestaBono)}</td></tr>` : ""}
      ${recibo.bonoTransporte > 0 ? `<tr><td>Bono de Transporte</td><td></td><td class="text-right">Bs. ${fmt(recibo.bonoTransporte)}</td></tr>` : ""}
      ${recibo.horasExtrasMonto > 0 ? `<tr><td>Horas Extras</td><td></td><td class="text-right">Bs. ${fmt(recibo.horasExtrasMonto)}</td></tr>` : ""}
      ${recibo.otrasAsignaciones > 0 ? `<tr><td>Otras Asignaciones</td><td></td><td class="text-right">Bs. ${fmt(recibo.otrasAsignaciones)}</td></tr>` : ""}
      <tr class="total-row"><td colspan="2">TOTAL ASIGNACIONES</td><td class="text-right">Bs. ${fmt(recibo.totalAsignaciones)}</td></tr>
    </tbody>
  </table>
  <table>
    <thead><tr><th colspan="3">DEDUCCIONES</th></tr></thead>
    <tbody>
      <tr><td>IVSS Obrero</td><td class="text-right"></td><td class="text-right">Bs. ${fmt(recibo.ivssObrero)}</td></tr>
      <tr><td>RPE Obrero</td><td></td><td class="text-right">Bs. ${fmt(recibo.rpeObrero)}</td></tr>
      <tr><td>LPH Obrero (BANAVIH)</td><td></td><td class="text-right">Bs. ${fmt(recibo.lphObrero)}</td></tr>
      <tr><td>Contrib. Especial Pensiones (9%)</td><td></td><td class="text-right">Bs. ${fmt(recibo.contribucionPensiones)}</td></tr>
      ${recibo.adelantoQuincena > 0 ? `<tr><td>Adelanto de Quincena</td><td></td><td class="text-right">Bs. ${fmt(recibo.adelantoQuincena)}</td></tr>` : ""}
      ${recibo.otrasDeduciones > 0 ? `<tr><td>Otras Deducciones</td><td></td><td class="text-right">Bs. ${fmt(recibo.otrasDeduciones)}</td></tr>` : ""}
      <tr class="total-row"><td colspan="2">TOTAL DEDUCCIONES</td><td class="text-right">Bs. ${fmt(recibo.totalDeducciones)}</td></tr>
    </tbody>
  </table>
  <table>
    <tbody>
      <tr class="total-row"><td>SALARIO NETO A PAGAR</td><td class="text-right">Bs. ${fmt(recibo.salarioNeto)}</td><td class="text-right">USD ${(recibo.salarioNetoUsd || 0).toFixed(2)}</td></tr>
    </tbody>
  </table>
  <div class="firma">
    <div class="firma-box">Firma del Empleador / Sello</div>
    <div class="firma-box">Firma del Trabajador / Huella</div>
  </div>
  <div class="legal-note">
    Documento generado conforme a la LOTTT (2012) y Ley de Metrología. 
    Este recibo es válido como comprobante de pago según Art. 104 LOTTT. 
    Nómina Venezuela® - ${new Date().toLocaleDateString("es-VE")}
  </div>
</div>
</body>
</html>`;
}

// ─── LIQUIDACIÓN PDF (LOTTT) ─────────────────────────────────────────────────
export interface LiquidacionPdfData {
  empresa: {
    razonSocial: string;
    rif: string;
    direccion?: string | null;
  };
  trabajador: {
    nombre: string;
    apellido: string;
    cedula: string;
    fechaIngreso: string;
    fechaEgreso: string;
    cargo?: string | null;
  };
  liquidation: {
    aniosServicio: number;
    mesesServicio: number;
    diasServicio: number;
    prestacionesSociales: {
      montoGarantiaTotal: number;
      interesesTotal: number;
      totalViaGarantia: number;
      diasRetroactividad: number;
      totalViaRetroactividad: number;
      montoFinal: number;
      viaAplicada: string;
    };
    vacaciones: {
      diasVacaciones: number;
      diasBonoVacacional: number;
      montoVacaciones: number;
      montoBonoVacacional: number;
      montoTotal: number;
    };
    utilidadesProporcionales: number;
    preaviso: number;
    totalLiquidacion: number;
    totalLiquidacionUSD: number;
  };
  tasaBCV: number;
  fechaLiquidacion: string;
}

export function generarHtmlLiquidacion(data: LiquidacionPdfData): string {
  const { empresa, trabajador, liquidation, tasaBCV, fechaLiquidacion } = data;
  const fmt = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Liquidación de Prestaciones - ${trabajador.apellido}, ${trabajador.nombre}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #333; background: #fff; }
    .liquidacion { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #0047AB; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { font-size: 18px; color: #0047AB; margin-bottom: 5px; }
    .header .empresa { font-size: 14px; font-weight: bold; }
    .header .rif { font-size: 11px; color: #666; }
    .section { margin-bottom: 20px; }
    .section-title { background: #f0f7ff; padding: 8px 12px; font-weight: bold; font-size: 12px; color: #0047AB; border-left: 4px solid #0047AB; margin-bottom: 10px; }
    .info-grid { display: table; width: 100%; }
    .info-row { display: table-row; }
    .info-label { display: table-cell; padding: 4px 8px; background: #f9f9f9; font-weight: bold; width: 35%; }
    .info-value { display: table-cell; padding: 4px 8px; }
    .doble-via { display: table; width: 100%; border-collapse: collapse; margin-top: 10px; }
    .doble-via th, .doble-via td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .doble-via th { background: #0047AB; color: #fff; font-size: 11px; }
    .doble-via .garantia { background: #e8f5e9; }
    .doble-via .retroactividad { background: #fff3e0; }
    .doble-via .seleccionado { background: #c8e6c9; font-weight: bold; border: 2px solid #2e7d32; }
    .total-box { background: #0047AB; color: #fff; padding: 15px; text-align: center; margin: 20px 0; border-radius: 4px; }
    .total-box .label { font-size: 12px; text-transform: uppercase; }
    .total-box .monto { font-size: 24px; font-weight: bold; }
    .total-box .usd { font-size: 11px; opacity: 0.9; }
    .firmas { display: table; width: 100%; margin-top: 40px; border-top: 1px solid #333; padding-top: 20px; }
    .firma-box { display: table-cell; width: 50%; text-align: center; padding: 20px; }
    .firma-line { border-top: 1px solid #333; padding-top: 8px; margin-top: 40px; font-size: 10px; }
    .sello { width: 100px; height: 100px; border: 2px solid #0047AB; border-radius: 50%; display: inline-block; line-height: 100px; color: #0047AB; font-weight: bold; font-size: 10px; transform: rotate(-15deg); opacity: 0.7; }
    .legal { font-size: 9px; color: #666; text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; }
    .badge-garantia { background: #4caf50; color: #fff; }
    .badge-retro { background: #ff9800; color: #fff; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="liquidacion">
    <div class="header">
      <h1>LIQUIDACIÓN DE PRESTACIONES SOCIALES</h1>
      <div class="empresa">${empresa.razonSocial}</div>
      <div class="rif">RIF: ${empresa.rif}</div>
      ${empresa.direccion ? `<div class="direccion">${empresa.direccion}</div>` : ''}
    </div>

    <div class="section">
      <div class="section-title">DATOS DEL TRABAJADOR</div>
      <div class="info-grid">
        <div class="info-row">
          <div class="info-label">Nombre y Apellido:</div>
          <div class="info-value">${trabajador.apellido}, ${trabajador.nombre}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Cédula de Identidad:</div>
          <div class="info-value">${trabajador.cedula}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Fecha de Ingreso:</div>
          <div class="info-value">${trabajador.fechaIngreso}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Fecha de Egreso:</div>
          <div class="info-value">${trabajador.fechaEgreso}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Tiempo de Servicio:</div>
          <div class="info-value">${liquidation.aniosServicio} años, ${liquidation.mesesServicio} meses, ${liquidation.diasServicio} días</div>
        </div>
        ${trabajador.cargo ? `
        <div class="info-row">
          <div class="info-label">Cargo:</div>
          <div class="info-value">${trabajador.cargo}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">DOUBLE VÍA - PRESTACIONES SOCIALES (ART. 142 LOTTT)</div>
      <table class="doble-via">
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Vía A: Garantía + Intereses</th>
            <th>Vía B: Retroactividad</th>
          </tr>
        </thead>
        <tbody>
          <tr class="${liquidation.prestacionesSociales.viaAplicada === 'garantia' ? 'seleccionado' : 'garantia'}">
            <td><strong>Garantía Acumulada</strong></td>
            <td>Bs. ${fmt(liquidation.prestacionesSociales.montoGarantiaTotal)}</td>
            <td rowspan="3" style="vertical-align: middle; background: #fff3e0;">
              ${liquidation.prestacionesSociales.diasRetroactividad} días × Salario Integral
            </td>
          </tr>
          <tr class="${liquidation.prestacionesSociales.viaAplicada === 'garantia' ? 'seleccionado' : 'garantia'}">
            <td><strong>Intereses (Tasa Activa BCV)</strong></td>
            <td>Bs. ${fmt(liquidation.prestacionesSociales.interesesTotal)}</td>
          </tr>
          <tr class="${liquidation.prestacionesSociales.viaAplicada === 'garantia' ? 'seleccionado' : 'retroactividad'}">
            <td><strong>SUBTOTAL</strong></td>
            <td><strong>Bs. ${fmt(liquidation.prestacionesSociales.totalViaGarantia)}</strong></td>
            <td><strong>Bs. ${fmt(liquidation.prestacionesSociales.totalViaRetroactividad)}</strong></td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top: 10px; text-align: center;">
        <span class="badge ${liquidation.prestacionesSociales.viaAplicada === 'garantia' ? 'badge-garantia' : 'badge-retro'}">
          ✓ SE APLICA ${liquidation.prestacionesSociales.viaAplicada === 'garantia' ? 'VÍA A (GARANTÍA + INTERESES)' : 'VÍA B (RETROACTIVIDAD)'}
        </span>
        <span style="margin-left: 15px; font-size: 11px;">
          Mayor beneficio para el trabajador según Art. 142 literal f LOTTT
        </span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">OTROS CONCEPTOS</div>
      <table class="doble-via">
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Días</th>
            <th class="text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vacaciones (Art. 190 LOTTT)</td>
            <td>${liquidation.vacaciones.diasVacaciones}</td>
            <td class="text-right">Bs. ${fmt(liquidation.vacaciones.montoVacaciones)}</td>
          </tr>
          <tr>
            <td>Bono Vacacional (Art. 192 LOTTT)</td>
            <td>${liquidation.vacaciones.diasBonoVacacional}</td>
            <td class="text-right">Bs. ${fmt(liquidation.vacaciones.montoBonoVacacional)}</td>
          </tr>
          <tr>
            <td>Utilidades Proporcionales (Art. 131 LOTTT)</td>
            <td>15</td>
            <td class="text-right">Bs. ${fmt(liquidation.utilidadesProporcionales)}</td>
          </tr>
          ${liquidation.preaviso > 0 ? `
          <tr>
            <td>Preaviso (Art. 80 LOTTT)</td>
            <td>Según tiempo de servicio</td>
            <td class="text-right">Bs. ${fmt(liquidation.preaviso)}</td>
          </tr>
          ` : ''}
        </tbody>
      </table>
    </div>

    <div class="total-box">
      <div class="label">TOTAL LIQUIDACIÓN A PAGAR</div>
      <div class="monto">Bs. ${fmt(liquidation.totalLiquidacion)}</div>
      <div class="usd">Equivalente: $ ${liquidation.totalLiquidacionUSD.toFixed(2)} USD (Tasa BCV: ${tasaBCV})</div>
    </div>

    <div class="firmas">
      <div class="firma-box">
        <div class="sello">SELLO<br/>EMPRESA</div>
        <div class="firma-line">
          Firma y Sello del Empleador<br/>
          <span style="font-size: 9px;">${empresa.razonSocial}</span>
        </div>
      </div>
      <div class="firma-box">
        <div class="firma-line">
          Firma del Trabajador<br/>
          <span style="font-size: 9px;">${trabajador.apellido}, ${trabajador.nombre} - C.I. ${trabajador.cedula}</span>
        </div>
        <div style="margin-top: 10px; border: 1px solid #333; height: 30px; width: 120px; margin: 10px auto;">
          <span style="font-size: 8px; color: #999;">Huella</span>
        </div>
      </div>
    </div>

    <div class="legal">
      Documento generado conforme a la LOTTT (Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras - 2012).<br/>
      Art. 142: Doble Vía de las Prestaciones Sociales | Art. 190-192: Vacaciones y Bono Vacacional | Art. 131-133: Utilidades<br/>
      Liquidación generada el ${fechaLiquidacion} - Nómina Venezuela®
    </div>
  </div>
</body>
</html>`;
}
