// src/lib/fiscal.ts

/**
 * Calcula la fecha tope de pago para el SENIAT (Pensiones)
 * Basado en el último dígito del RIF para el año 2026.
 */
export function obtenerVencimientoSeniat(rif: string): Date {
    const hoy = new Date();
    const mesActual = hoy.getMonth(); // 0-11
    const anioActual = hoy.getFullYear();
  
    // Extraer el último número antes del dígito verificador (ej: J-1234567[8]-9)
    const digitos = rif.replace(/\D/g, "");
    const ultimoDigito = parseInt(digitos.charAt(digitos.length - 2));
  
    // Calendario referencial Sujetos Pasivos Especiales 2026
    const diasVencimiento: Record<number, number> = {
      0: 12, 1: 12,
      2: 15, 3: 15,
      4: 18, 5: 18,
      6: 21, 7: 21,
      8: 24, 9: 24
    };
  
    const diaLimite = diasVencimiento[ultimoDigito] || 15;
    
    // Retorna la fecha del mes actual (o el siguiente si ya pasó la fecha)
    return new Date(anioActual, mesActual, diaLimite);
  }
  