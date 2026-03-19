'use client';
import React from 'react';
import { obtenerVencimientoSeniat } from '@/lib/fiscal';

interface AlertasFiscalesProps {
  empresa: {
    rif: string;
    razonSocial: string;
  };
}

export const AlertasFiscales: React.FC<AlertasFiscalesProps> = ({ empresa }) => {
  const hoy = new Date();
  const fechaLimite = obtenerVencimientoSeniat(empresa.rif);
  
  // Cálculo de diferencia en días
  const diferenciaMs = fechaLimite.getTime() - hoy.getTime();
  const diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

  // Solo mostramos la alerta si faltan 7 días o menos para el vencimiento
  if (diasRestantes > 7 || diasRestantes < 0) return null;

  const esCritico = diasRestantes <= 2;

  return (
    <div className={`p-4 mb-6 rounded-lg border-l-4 shadow-sm ${
      esCritico 
        ? 'bg-red-50 border-red-500 text-red-800' 
        : 'bg-amber-50 border-amber-500 text-amber-800'
    }`}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{esCritico ? '🚨' : '⚠️'}</span>
        <div>
          <h4 className="font-bold text-sm uppercase">Obligación SENIAT: Protección de Pensiones</h4>
          <p className="text-sm">
            La declaración del <strong>9% (Gasto Patronal)</strong> de la empresa 
            <span className="italic"> {empresa.razonSocial}</span> vence en 
            <span className="font-bold underline"> {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'}</span>.
          </p>
          <p className="text-xs mt-1 opacity-80">
            Fecha límite: {fechaLimite.toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
};
