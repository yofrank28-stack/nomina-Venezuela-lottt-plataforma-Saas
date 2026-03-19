'use client';
import React, { useState, useEffect } from 'react';
import { generarReportePensiones, imprimirResumenPensiones } from '../../../../lib/reportes';
import { obtenerVencimientoSeniat } from '../../../../lib/fiscal';
import { Download, Building2, Calculator, Calendar } from 'lucide-react';

export default function PaginaPensiones() {
  // Simulación de datos (Aquí conectarías con tu base de datos de Prisma/SQL)
  const [empresa] = useState({ razonSocial: "Tu Empresa SaaS C.A.", rif: "J-12345678-9" });
  const [mesActual] = useState(new Date().getMonth() + 1);
  const [anioActual] = useState(2026);
  
  // Datos calculados (Simulados para el ejemplo)
  const [datos, setDatos] = useState({
    totalSalarios: 45000.50,
    totalBonificaciones: 12000.25,
    baseImponible: 57000.75,
    aportePatronal: 5130.07 // 9%
  });

  const fechaLimite = obtenerVencimientoSeniat(empresa.rif);
  const f = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="flex justify-between items-end mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">
            Declaración Especial de Pensiones (9%)
          </h1>
          <p className="text-slate-500 text-sm">Control fiscal ante el SENIAT - Ley de Protección de Pensiones</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">CALENDARIO 2026</span>
        </div>
      </div>

      {/* Alerta de Vencimiento */}
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8 flex items-center gap-4 shadow-sm">
        <Calendar className="text-amber-600" size={32} />
        <div>
          <p className="text-amber-900 font-medium">Próximo vencimiento según Terminal de RIF: <strong>{empresa.rif}</strong></p>
          <p className="text-amber-700 text-sm">Su declaración debe estar lista antes del: <strong>{fechaLimite.toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}</strong></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card: Base Imponible */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Calculator size={16} />
            <span className="text-xs font-bold uppercase">Base Imponible Total</span>
          </div>
          <p className="text-2xl font-black text-slate-900">Bs. {f(datos.baseImponible)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Suma de conceptos salariales y no salariales</p>
        </div>

        {/* Card: Aporte 9% */}
        <div className="bg-blue-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center gap-2 opacity-80 mb-2">
            <Building2 size={16} />
            <span className="text-xs font-bold uppercase">Monto a Declarar (9%)</span>
          </div>
          <p className="text-3xl font-black italic">Bs. {f(datos.aportePatronal)}</p>
          <p className="text-[10px] opacity-70 mt-1 italic">Gasto patronal exclusivo (No deducible al trabajador)</p>
        </div>

        {/* Card: Acciones */}
        <div className="flex flex-col gap-3">
          <button 
            className="flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-3 rounded-lg hover:bg-slate-900 transition-all font-bold text-sm"
            onClick={() => alert('Generando archivo para portal SENIAT...')}
          >
            <Download size={18} /> DESCARGAR RESUMEN TXT
          </button>
          <button 
            className="flex items-center justify-center gap-2 border-2 border-slate-800 text-slate-800 px-4 py-3 rounded-lg hover:bg-slate-50 transition-all font-bold text-sm"
            onClick={() => window.print()}
          >
            IMPRIMIR COMPROBANTE
          </button>
        </div>
      </div>

      {/* Tabla de Desglose */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-bottom font-bold text-slate-700 text-sm">
          Desglose Mensual de Conceptos (Periodo {mesActual}/{anioActual})
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase">
            <tr>
              <th className="p-4">Concepto de Ingreso</th>
              <th className="p-4">Clasificación Legal</th>
              <th className="p-4 text-right">Monto Total (Bs.)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="p-4 font-medium italic text-slate-700 underline decoration-blue-200">Sueldos y Salarios Normales</td>
              <td className="p-4 text-xs text-slate-500 italic">Salario Base (LOTTT Art. 104)</td>
              <td className="p-4 text-right font-mono">Bs. {f(datos.totalSalarios)}</td>
            </tr>
            <tr>
              <td className="p-4 font-medium italic text-slate-700 underline decoration-amber-200 text-[13px]">Bonificaciones No Salariales</td>
              <td className="p-4 text-xs text-slate-500 italic font-[450]">Cesta Ticket, Bonos de Ayuda, etc.</td>
              <td className="p-4 text-right font-mono">Bs. {f(datos.totalBonificaciones)}</td>
            </tr>
          </tbody>
          <tfoot className="bg-slate-50 font-bold">
            <tr>
              <td className="p-4 text-slate-800" colSpan={2}>TOTAL INGRESOS INTEGRALES A DECLARAR</td>
              <td className="p-4 text-right text-blue-700 font-mono">Bs. {f(datos.baseImponible)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-6 text-[9px] text-slate-400 italic text-center">
        * Este reporte es referencial para facilitar el llenado de la Forma 19 / DPP en el Portal Fiscal del SENIAT.
      </p>
    </div>
  );
}
