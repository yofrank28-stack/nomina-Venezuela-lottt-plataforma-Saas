'use client';
import React from 'react';
import { FileText, AlertCircle } from 'lucide-react'; // Si usas lucide-react, si no, usa iconos normales

export const BotonSeniat = ({ onClick }: { onClick?: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-all shadow-md group"
    >
      <div className="p-2 bg-blue-600 rounded-md group-hover:bg-blue-500">
        <FileText size={18} />
      </div>
      <div className="flex flex-col text-left">
        <span className="font-bold uppercase tracking-wider text-[10px]">Fiscal SENIAT</span>
        <span className="text-[12px] opacity-90">Declaración Pensiones (9%)</span>
      </div>
      <AlertCircle size={14} className="ml-auto text-blue-300 animate-pulse" />
    </button>
  );
};
