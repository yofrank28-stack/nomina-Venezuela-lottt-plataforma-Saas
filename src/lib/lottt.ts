/**
 * Motor Legal LOTTT (Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras)
 * Ley promulgada 07/05/2012 - Venezuela
 */

export interface SalarioIntegral {
  salarioBase: number;
  alicuotaUtilidades: number;    // Dias utilidades / 360
  alicuotaBonoVacacional: number; // Dias bono vacacional / 360
  salarioDiarioIntegral: number;
}

export interface CalculoPrestacionesParams {
  salarioBase: number;             // Mensual en VES
  diasUtilidades: number;          // Configurado por empresa (mín 15)
  aniosServicio: number;
  mesesServicio: number;
  trimestresAcumulados: number;
  interesesAcumulados: number;     // Intereses sobre garantía
  tasaInteresBCV: number;          // % anual tasa activa BCV
}

export interface ResultadoPrestaciones {
  // Vía A: Garantía (Art. 142 a)
  montoGarantiaTotal: number;
  interesesTotal: number;
  totalViaGarantia: number;
  // Vía B: Retroactividad (Art. 142 b)
  salarioDiarioIntegralActual: number;
  diasRetroactividad: number;
  totalViaRetroactividad: number;
  // Doble vía - se paga el mayor
  montoFinal: number;
  viaAplicada: "garantia" | "retroactividad";
  detalle: string;
}

export interface CalculoVacacionesParams {
  aniosServicio: number;
  salarioDiario: number;
}

export interface ResultadoVacaciones {
  diasVacaciones: number;
  diasBonoVacacional: number;
  montoVacaciones: number;
  montoBonoVacacional: number;
  montoTotal: number;
}

export interface CalculoUtilidadesParams {
  diasUtilidades: number;          // Configurado por empresa (mín 15)
  salarioPromedioDiario: number;
  diasTrabajados: number;          // Del año fiscal
}

export interface CalculoNominaParams {
  salarioBase: number;
  diasTrabajados: number;
  horasExtras: HoraExtra[];
  cestaBono: number;
  bonoTransporte: number;
  otrasAsignaciones: number;
  adelantoQuincena: number;
  otrasDeduciones: number;
  // Tasas de empresa
  ivssPatronal: number;
  ivssObrero: number;
  rpePatronal: number;
  rpeObrero: number;
  lphPatronal: number;
  lphObrero: number;
  // Tasa BCV
  tasaBCV: number;
  // Salario mínimo vigente (indexado BCV)
  salarioMinimoVES: number;
}

export interface HoraExtra {
  tipo: "diurna" | "nocturna" | "diurna_feriado" | "nocturna_feriado";
  cantidad: number;
}

export interface ResultadoNomina {
  // Asignaciones
  salarioBaseProporcional: number;
  horasExtrasMonto: number;
  cestaBono: number;
  bonoTransporte: number;
  otrasAsignaciones: number;
  totalAsignaciones: number;
  // Deducciones
  ivssObrero: number;
  rpeObrero: number;
  lphObrero: number;
  contribucionPensiones: number;  // CEPP 9%
  adelantoQuincena: number;
  otrasDeduciones: number;
  totalDeduciones: number;
  // Aportes patronales (informativo)
  ivssPatronal: number;
  rpePatronal: number;
  lphPatronal: number;
  // Resultado
  salarioDiario: number;
  salarioNeto: number;
  salarioNetoUSD: number;
}

// ─── RECARGOS HORAS EXTRAS (Art. 118 LOTTT) ──────────────────────────────────
const RECARGOS_HORAS_EXTRAS = {
  diurna: 0.25,           // 25% recargo
  nocturna: 0.50,         // 50% recargo (hora nocturna base 30% + 50% extra = 80%)
  diurna_feriado: 1.00,   // 100% recargo
  nocturna_feriado: 1.50, // 150% recargo
};

// Recargo nocturno base (Art. 117 LOTTT)
const RECARGO_NOCTURNO_BASE = 0.30;

// ─── CÁLCULO SALARIO INTEGRAL ─────────────────────────────────────────────────
export function calcularSalarioIntegral(
  salarioBase: number,
  diasUtilidades: number,
  aniosServicio: number
): SalarioIntegral {
  const salarioDiario = salarioBase / 30;
  // Bono vacacional: 15 días + 1 por año de servicio (Art. 192 LOTTT)
  const diasBonoVacacional = 15 + Math.min(aniosServicio, 30);
  // Alícuota diaria de utilidades
  const alicuotaUtilidades = (diasUtilidades * salarioDiario) / 360;
  // Alícuota diaria de bono vacacional
  const alicuotaBonoVacacional = (diasBonoVacacional * salarioDiario) / 360;
  const salarioDiarioIntegral = salarioDiario + alicuotaUtilidades + alicuotaBonoVacacional;

  return {
    salarioBase,
    alicuotaUtilidades,
    alicuotaBonoVacacional,
    salarioDiarioIntegral,
  };
}

// ─── DOBLE VÍA PRESTACIONES SOCIALES (Art. 142 LOTTT) ─────────────────────────
export function calcularPrestacionesSociales(
  params: CalculoPrestacionesParams
): ResultadoPrestaciones {
  const {
    salarioBase,
    diasUtilidades,
    aniosServicio,
    trimestresAcumulados,
    interesesAcumulados,
    tasaInteresBCV,
  } = params;

  const { salarioDiarioIntegral } = calcularSalarioIntegral(salarioBase, diasUtilidades, aniosServicio);

  // VÍA A: GARANTÍA (Art. 142 a)
  // 15 días de salario integral por trimestre hasta el 2do año
  // 45 días de salario integral a partir del 3er año (adicionales)
  // En la práctica: 15 días/trimestre acumulados en fideicomiso
  const diasPorTrimestre = aniosServicio >= 2 ? 15 : 15; // base 15, adicionales según antigüedad
  // Adicionales (Art. 142 a segundo párrafo): 2 días adicionales por año a partir del 2do año (máx 30)
  const diasAdicionalesAnuales = aniosServicio >= 2 ? Math.min((aniosServicio - 1) * 2, 30) : 0;
  const diasGarantiaTrimestre = diasPorTrimestre + (diasAdicionalesAnuales / 4);
  const montoGarantiaTrimestre = diasGarantiaTrimestre * salarioDiarioIntegral;

  // Intereses sobre garantía (tasa activa BCV)
  const interesesTrimestre = (montoGarantiaTrimestre * (tasaInteresBCV / 100)) / 4;

  // Acumulado total garantía
  const montoGarantiaTotal = (trimestresAcumulados * diasGarantiaTrimestre) * salarioDiarioIntegral;
  const interesesTotal = interesesAcumulados + interesesTrimestre;
  const totalViaGarantia = montoGarantiaTotal + interesesTotal;

  // VÍA B: RETROACTIVIDAD (Art. 142 b)
  // 30 días de salario integral por año de servicio
  const diasRetroactividad = Math.max(aniosServicio * 30, aniosServicio >= 1 ? 30 : 0);
  const totalViaRetroactividad = diasRetroactividad * salarioDiarioIntegral;

  // DOBLE VÍA: se paga el MAYOR (Art. 142 f)
  const montoFinal = Math.max(totalViaGarantia, totalViaRetroactividad);
  const viaAplicada: "garantia" | "retroactividad" =
    totalViaGarantia >= totalViaRetroactividad ? "garantia" : "retroactividad";

  return {
    montoGarantiaTotal,
    interesesTotal,
    totalViaGarantia,
    salarioDiarioIntegralActual: salarioDiarioIntegral,
    diasRetroactividad,
    totalViaRetroactividad,
    montoFinal,
    viaAplicada,
    detalle: `Vía ${viaAplicada === "garantia" ? "A (Garantía + Intereses)" : "B (Retroactividad 30 días/año)"}: Bs. ${montoFinal.toFixed(2)}`,
  };
}

// ─── CÁLCULO VACACIONES (Art. 190-192 LOTTT) ──────────────────────────────────
export function calcularVacaciones(params: CalculoVacacionesParams): ResultadoVacaciones {
  const { aniosServicio, salarioDiario } = params;

  // Días de vacaciones: 15 + 1 por cada año adicional (Art. 190)
  const diasVacaciones = 15 + aniosServicio;

  // Bono vacacional: 15 días + 1 por año (Art. 192), diferente de días de descanso
  // La ley dice: bono = salario normal de los días de vacaciones
  // Pero comúnmente: bono vacacional = 15 + año
  const diasBonoVacacional = 15 + aniosServicio;

  const montoVacaciones = diasVacaciones * salarioDiario;
  const montoBonoVacacional = diasBonoVacacional * salarioDiario;

  return {
    diasVacaciones,
    diasBonoVacacional,
    montoVacaciones,
    montoBonoVacacional,
    montoTotal: montoVacaciones + montoBonoVacacional,
  };
}

// ─── CÁLCULO UTILIDADES (Art. 131-133 LOTTT) ──────────────────────────────────
export function calcularUtilidades(params: CalculoUtilidadesParams): number {
  const { diasUtilidades, salarioPromedioDiario, diasTrabajados } = params;
  // Prorrateo si no trabajó el año completo
  const porcentajeTrabajado = Math.min(diasTrabajados / 360, 1);
  return diasUtilidades * salarioPromedioDiario * porcentajeTrabajado;
}

// ─── CONTRIBUCIÓN ESPECIAL DE PROTECCIÓN A LAS PENSIONES (CEPP) ──────────────
// Decreto 4.466 (2021) - 9% sobre base mínima indexada BCV
export function calcularCEPP(
  salarioBase: number,
  salarioMinimoVES: number,
  tasaBCV: number,
  porcentajeCEPP: number = 9
): number {
  // Base mínima: salario base o salario mínimo en VES (el mayor)
  const baseCalculo = Math.max(salarioBase, salarioMinimoVES);
  return baseCalculo * (porcentajeCEPP / 100);
}

// ─── CÁLCULO COMPLETO DE NÓMINA ───────────────────────────────────────────────
export function calcularNomina(params: CalculoNominaParams): ResultadoNomina {
  const {
    salarioBase,
    diasTrabajados,
    horasExtras,
    cestaBono,
    bonoTransporte,
    otrasAsignaciones,
    adelantoQuincena,
    otrasDeduciones,
    ivssPatronal,
    ivssObrero,
    rpePatronal,
    rpeObrero,
    lphPatronal,
    lphObrero,
    tasaBCV,
    salarioMinimoVES,
  } = params;

  const salarioDiario = salarioBase / 30;
  const salarioBaseProporcional = salarioDiario * diasTrabajados;

  // Horas extras
  let horasExtrasMonto = 0;
  for (const he of horasExtras) {
    const valorHora = salarioDiario / 8;
    const recargo = RECARGOS_HORAS_EXTRAS[he.tipo];
    const factor = he.tipo.includes("nocturna") ? 1 + RECARGO_NOCTURNO_BASE + recargo : 1 + recargo;
    horasExtrasMonto += valorHora * he.cantidad * factor;
  }

  const totalAsignaciones =
    salarioBaseProporcional + horasExtrasMonto + cestaBono + bonoTransporte + otrasAsignaciones;

  // Deducciones obreras (sobre salario base proporcional)
  const baseDeduccion = salarioBaseProporcional;
  const ivssObreroMonto = baseDeduccion * (ivssObrero / 100);
  const rpeObreroMonto = baseDeduccion * (rpeObrero / 100);
  const lphObreroMonto = baseDeduccion * (lphObrero / 100);

  // CEPP 9%
  const contribucionPensiones = calcularCEPP(salarioBase, salarioMinimoVES, tasaBCV);

  const totalDeduciones =
    ivssObreroMonto + rpeObreroMonto + lphObreroMonto +
    contribucionPensiones + adelantoQuincena + otrasDeduciones;

  const salarioNeto = totalAsignaciones - totalDeduciones;
  const salarioNetoUSD = tasaBCV > 0 ? salarioNeto / tasaBCV : 0;

  // Aportes patronales (informativos)
  const ivssPatronalMonto = baseDeduccion * (ivssPatronal / 100);
  const rpePatronalMonto = baseDeduccion * (rpePatronal / 100);
  const lphPatronalMonto = baseDeduccion * (lphPatronal / 100);

  return {
    salarioBaseProporcional,
    horasExtrasMonto,
    cestaBono,
    bonoTransporte,
    otrasAsignaciones,
    totalAsignaciones,
    ivssObrero: ivssObreroMonto,
    rpeObrero: rpeObreroMonto,
    lphObrero: lphObreroMonto,
    contribucionPensiones,
    adelantoQuincena,
    otrasDeduciones,
    totalDeduciones,
    ivssPatronal: ivssPatronalMonto,
    rpePatronal: rpePatronalMonto,
    lphPatronal: lphPatronalMonto,
    salarioDiario,
    salarioNeto,
    salarioNetoUSD,
  };
}

// ─── LIQUIDACIÓN DE EGRESO ────────────────────────────────────────────────────
export interface LiquidacionParams {
  salarioBase: number;
  diasUtilidades: number;
  fechaIngreso: string;
  fechaEgreso: string;
  motivoEgreso: string;
  tasaInteresBCV: number;
  interesesPrestacionesAcumulados: number;
  tasaBCV: number;
}

export interface ResultadoLiquidacion {
  aniosServicio: number;
  mesesServicio: number;
  diasServicio: number;
  prestacionesSociales: ResultadoPrestaciones;
  vacaciones: ResultadoVacaciones;
  utilidadesProporcionales: number;
  preaviso: number;
  totalLiquidacion: number;
  totalLiquidacionUSD: number;
}

export function calcularLiquidacion(params: LiquidacionParams): ResultadoLiquidacion {
  const { salarioBase, diasUtilidades, fechaIngreso, fechaEgreso, motivoEgreso, tasaInteresBCV, interesesPrestacionesAcumulados, tasaBCV } = params;

  const ingreso = new Date(fechaIngreso);
  const egreso = new Date(fechaEgreso);
  const diffMs = egreso.getTime() - ingreso.getTime();
  const diasServicio = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const aniosServicio = Math.floor(diasServicio / 365);
  const mesesServicio = Math.floor((diasServicio % 365) / 30);
  const trimestres = Math.floor(diasServicio / 90);

  const prestaciones = calcularPrestacionesSociales({
    salarioBase,
    diasUtilidades,
    aniosServicio,
    mesesServicio,
    trimestresAcumulados: trimestres,
    interesesAcumulados: interesesPrestacionesAcumulados,
    tasaInteresBCV,
  });

  const salarioDiario = salarioBase / 30;
  const vacs = calcularVacaciones({ aniosServicio, salarioDiario });

  // Utilidades proporcionales
  const diasTrabajadosAnio = diasServicio % 365;
  const utilidadesProp = calcularUtilidades({
    diasUtilidades,
    salarioPromedioDiario: salarioDiario,
    diasTrabajados: diasTrabajadosAnio,
  });

  // Preaviso (Art. 80 LOTTT) - solo si es despido injustificado
  let preaviso = 0;
  if (motivoEgreso === "despido") {
    if (aniosServicio < 1) preaviso = 15 * salarioDiario;
    else if (aniosServicio < 2) preaviso = 30 * salarioDiario;
    else if (aniosServicio < 5) preaviso = 45 * salarioDiario;
    else preaviso = 60 * salarioDiario;
  }

  const totalLiquidacion =
    prestaciones.montoFinal + vacs.montoTotal + utilidadesProp + preaviso;

  return {
    aniosServicio,
    mesesServicio,
    diasServicio,
    prestacionesSociales: prestaciones,
    vacaciones: vacs,
    utilidadesProporcionales: utilidadesProp,
    preaviso,
    totalLiquidacion,
    totalLiquidacionUSD: tasaBCV > 0 ? totalLiquidacion / tasaBCV : 0,
  };
}

// ─── UTILIDADES DE FORMATO ────────────────────────────────────────────────────
export function formatBs(amount: number): string {
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
