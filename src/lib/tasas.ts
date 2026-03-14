/**
 * Módulo de actualización de tasas BCV
 * - Tasa USD/VES (dólar BCV)
 * - Tasa Activa Banco Central (para intereses prestaciones)
 */

import db from "@/db";
import { tasas } from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface TasaBCV {
  valor: number;
  fechaVigencia: string;
  fuente: string;
}

// ─── OBTENER TASA VIGENTE ─────────────────────────────────────────────────────
export function getTasaVigente(tipo: string): TasaBCV | null {
  const tasa = db
    .select()
    .from(tasas)
    .where(eq(tasas.tipo, tipo))
    .orderBy(desc(tasas.fechaVigencia))
    .limit(1)
    .get();

  if (!tasa) return null;
  return { valor: tasa.valor, fechaVigencia: tasa.fechaVigencia, fuente: tasa.fuente || "" };
}

// ─── OBTENER HISTORIAL DE TASAS ───────────────────────────────────────────────
export function getHistorialTasas(tipo: string, limit: number = 30) {
  return db
    .select()
    .from(tasas)
    .where(eq(tasas.tipo, tipo))
    .orderBy(desc(tasas.fechaVigencia))
    .limit(limit)
    .all();
}

// ─── OBTENER TASA PARA FECHA ESPECÍFICA ───────────────────────────────────────
export function getTasaParaFecha(tipo: string, fecha: string): TasaBCV | null {
  // Encuentra la tasa vigente más reciente antes o igual a la fecha dada
  const tasa = db
    .select()
    .from(tasas)
    .where(and(eq(tasas.tipo, tipo), gte(tasas.fechaVigencia, fecha)))
    .orderBy(tasas.fechaVigencia)
    .limit(1)
    .get();

  if (!tasa) {
    // Fallback: la más reciente disponible
    return getTasaVigente(tipo);
  }
  return { valor: tasa.valor, fechaVigencia: tasa.fechaVigencia, fuente: tasa.fuente || "" };
}

// ─── SCRAPING / API BCV ───────────────────────────────────────────────────────
export async function fetchTasaBCVDesdeAPI(): Promise<number | null> {
  try {
    // ExchangeRate API pública (no oficial)
    const response = await fetch(
      "https://ve.dolarapi.com/v1/dolares/oficial",
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) }
    );
    if (!response.ok) throw new Error("API no disponible");
    const data = await response.json() as { promedio?: number; precio?: number };
    const valor = data.promedio || data.precio;
    if (typeof valor === "number" && valor > 0) return valor;
    return null;
  } catch {
    return null;
  }
}

export async function fetchTasaBCVScraping(): Promise<number | null> {
  try {
    // Fuente alternativa: ExchangeMonitor Venezuela
    const response = await fetch(
      "https://exchangemonitor.net/api/bcv",
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) }
    );
    if (!response.ok) return null;
    const data = await response.json() as { price?: number; value?: number };
    const valor = data.price || data.value;
    if (typeof valor === "number" && valor > 0) return valor;
    return null;
  } catch {
    return null;
  }
}

// ─── ACTUALIZACIÓN AUTOMÁTICA DE TASAS ───────────────────────────────────────
export async function actualizarTasaBCV(creadoPor?: string): Promise<{
  actualizada: boolean;
  valor?: number;
  error?: string;
}> {
  // Verificar si ya se actualizó hoy
  const hoy = new Date().toISOString().split("T")[0];
  const existente = db
    .select()
    .from(tasas)
    .where(and(eq(tasas.tipo, "bcv_usd_ves"), gte(tasas.fechaVigencia, hoy)))
    .get();

  if (existente) {
    return { actualizada: false, valor: existente.valor };
  }

  // Intentar API primero, luego scraping
  let valor = await fetchTasaBCVDesdeAPI();
  let fuente = "api_bcv";
  let urlFuente = "https://ve.dolarapi.com/v1/dolares/oficial";

  if (!valor) {
    valor = await fetchTasaBCVScraping();
    fuente = "scraping";
    urlFuente = "https://exchangemonitor.net/api/bcv";
  }

  if (!valor) {
    return { actualizada: false, error: "No se pudo obtener la tasa BCV de ninguna fuente" };
  }

  // Guardar en base de datos
  db.insert(tasas).values({
    id: randomUUID(),
    tipo: "bcv_usd_ves",
    valor,
    fechaVigencia: new Date().toISOString(),
    fuente,
    urlFuente,
    creadoPor,
  }).run();

  return { actualizada: true, valor };
}

// ─── SALARIO MÍNIMO INDEXADO ──────────────────────────────────────────────────
// El salario mínimo legal se publica en Gaceta Oficial.
// Para CEPP se toma como base mínima indexada a BCV.
// Valor de referencia a actualizar manualmente o vía API gubernamental.
export const SALARIO_MINIMO_VES_BASE = 130; // Bs. 130 (referencia, actualizar periódicamente)

export function getSalarioMinimoIndexado(tasaBCV: number): number {
  // Mínimo en USD (referencia $3.5/mes) convertido a VES
  const minimoUSD = 3.5;
  return Math.max(SALARIO_MINIMO_VES_BASE, minimoUSD * tasaBCV);
}
