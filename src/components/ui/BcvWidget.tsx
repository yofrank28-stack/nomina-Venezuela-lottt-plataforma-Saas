"use client";

interface BcvWidgetProps {
  tasaUsd: number;
  tasaInteres: number;
}

export default function BcvWidget({ tasaUsd, tasaInteres }: BcvWidgetProps) {
  return (
    <div className="bcv-widget">
      <div className="bcv-item">
        <span className="bcv-label">BCV (USD)</span>
        <div className="bcv-value">
          <span className="bcv-number">Bs. {tasaUsd.toFixed(2)}</span>
          <div className="bcv-dot"></div>
        </div>
      </div>
      <div className="bcv-divider"></div>
      <div className="bcv-item">
        <span className="bcv-label">Tasa Activa BCV</span>
        <div className="bcv-value">
          <span className="bcv-number warning">{tasaInteres.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}
