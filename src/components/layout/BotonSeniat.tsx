"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BotonSeniat() {
  const pathname = usePathname();
  const isActive = pathname.startsWith("/dashboard/fiscal");

  return (
    <Link href="/dashboard/fiscal/pensiones" className={`btn-seniat ${isActive ? "active" : ""}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="seniat-icon"
      >
        <path d="M2 10h3" />
        <path d="M7 10h2" />
        <path d="M14 10h7" />
        <path d="M2 14h2" />
        <path d="M6 14h2" />
        <path d="M12 14h3" />
        <path d="M19 14h3" />
        <path d="M2 6h3" />
        <path d="M7 6h2" />
        <path d="M14 6h7" />
        <path d="M2 18h2" />
        <path d="M6 18h2" />
        <path d="M12 18h3" />
        <path d="M19 18h3" />
      </svg>
      <span className="seniat-text">Fiscal SENIAT</span>
      <style jsx>{`
        .btn-seniat {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 8px;
          background-color: #0033a0; /* Azul SENIAT */
          color: white;
          font-weight: 500;
          text-decoration: none;
          transition: background-color 0.2s ease;
          margin: 16px 16px 0;
        }
        .btn-seniat:hover {
          background-color: #00227a;
        }
        .btn-seniat.active {
          background-color: #001a5e;
        }
        .seniat-icon {
          flex-shrink: 0;
        }
        .seniat-text {
          flex-grow: 1;
        }
      `}</style>
    </Link>
  );
}