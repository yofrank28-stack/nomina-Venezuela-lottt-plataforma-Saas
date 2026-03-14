# Active Context: Nómina Venezuela — SaaS Multiempresa

## Current State

**Status**: ✅ Producción — Build exitoso, 24 rutas compiladas

Plataforma SaaS de nómina legal venezolana (LOTTT 2012), multi-empresa con aislamiento total por `empresa_id`,
arquitectura monolítica ligera SSR (Next.js 16 + better-sqlite3).

## Recently Completed

- [x] Esquema SQLite completo (15 tablas) con índices por empresa_id
- [x] Motor legal LOTTT: Doble Vía Prestaciones (Art. 142), Vacaciones (Art. 190-192), Utilidades, CEPP 9%
- [x] Sistema de autenticación JWT (cookie httpOnly, 8h) con 4 roles: Master / Admin / Analista / Trabajador
- [x] Middleware de protección de rutas con aislamiento por empresa_id
- [x] Dashboard Master: gestión de licencias, validación de pagos digitales (Binance/Zinli/PagoMóvil/BanescoPA)
- [x] Dashboard Admin Empresa: configuración IVSS (9-11%), RPE, LPH, centros de costo, cargos
- [x] Módulo Trabajadores: CRUD completo con datos laborales, salario, banco, NSS IVSS
- [x] Procesamiento de nómina: períodos (mensual/quincenal/semanal), cálculo automático, aprobación
- [x] Motor Tasas BCV: actualización diaria vía API/scraping, log histórico, registro manual
- [x] Prestaciones Sociales: simulador doble vía, cálculo de liquidación de egreso
- [x] Vacaciones: libro de vacaciones, cálculo automático 15+1 días/año
- [x] Reportes: recibo HTML (printable), Libro Salarios TXT, ACH Banesco/Mercantil, TIUNA/IVSS, BANAVIH/LPH
- [x] Diseño Enterprise: CSS custom sin animaciones, alta legibilidad, sidebar responsivo
- [x] Seed inicial: 3 usuarios demo + empresa demo + 3 trabajadores + tasas BCV

## Credenciales Demo

| Rol | Email | Password |
|-----|-------|----------|
| Master | master@nominavenezuela.com | Master@2024! |
| Admin Empresa | admin@empresa.com | Admin@2024! |
| Analista | analista@empresa.com | Analista@2024! |

## Current Structure

```
src/
├── app/
│   ├── login/page.tsx                  — Autenticación
│   ├── dashboard/                      — Panel Admin/Analista/Trabajador
│   │   ├── page.tsx                    — Dashboard con KPIs
│   │   ├── trabajadores/               — CRUD trabajadores
│   │   ├── nomina/                     — Períodos y recibos
│   │   ├── prestaciones/               — Doble vía + liquidaciones
│   │   ├── vacaciones/                 — Libro de vacaciones
│   │   ├── tasas/                      — BCV rates + historial
│   │   ├── reportes/                   — Descarga de archivos
│   │   └── configuracion/              — Empresa + IVSS + licencia
│   ├── master/                         — Panel Master
│   │   ├── page.tsx                    — Dashboard Master
│   │   ├── empresas/                   — Gestión de clientes
│   │   ├── pagos/                      — Validación comprobantes
│   │   └── tasas/                      — Gestión tasas BCV
│   └── api/                            — API Routes
│       ├── auth/login|logout           — Autenticación
│       ├── trabajadores                — CRUD
│       ├── nomina                      — Procesamiento
│       ├── prestaciones                — (incluido en LOTTT engine)
│       ├── vacaciones                  — CRUD vacaciones
│       ├── tasas                       — BCV rates
│       ├── pagos                       — Licencias
│       ├── empresas                    — Tenant management
│       └── reportes                    — TXT/HTML generation
├── db/
│   ├── schema.ts                       — Drizzle ORM schema (15 tablas)
│   ├── index.ts                        — DB connection (WAL mode)
│   └── migrate.ts                      — DDL migrations
├── lib/
│   ├── auth.ts                         — JWT sessions + roles
│   ├── lottt.ts                        — Motor legal completo
│   ├── tasas.ts                        — BCV API/scraping
│   └── reportes.ts                     — Generadores TXT/HTML
└── components/
    └── layout/Sidebar.tsx              — Sidebar SSR con roles
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 App Router (SSR) |
| Database | SQLite via better-sqlite3 (WAL mode) |
| ORM | Drizzle ORM |
| Auth | JWT (jose) + bcryptjs |
| Styling | CSS custom (no Tailwind classes pesadas, no animaciones) |
| Package Manager | Bun |

## Key Architecture Decisions

- **Multi-tenant isolation**: Toda query incluye `WHERE empresa_id = ?` de la sesión JWT
- **No heavy hydration**: Server Components por defecto, `"use client"` solo en formularios
- **SQLite WAL mode**: Optimizado para hardware limitado (2MB cache, NORMAL sync)
- **No animations**: `animation-duration: 0.01ms` global para CPU mínimo
- **Legal compliance**: Todos los cálculos referencias artículos específicos LOTTT 2012

## Session History

| Date | Changes |
|------|---------|
| 2026-03-14 | Implementación completa de plataforma Nómina Venezuela desde plantilla Next.js |
| 2026-03-14 | Actualizada fórmula intereses prestaciones: Interés = Acumulado * Tasa_Activa_Mensual (58.30%/12) |
| 2026-03-14 | Módulo Exportación Bancaria Intereses: botón cobalt blue, modal banco, validación 20 dígitos, TXT formato fijo Banesco/Mercantil |
| 2026-03-14 | Master: Gestión de Pagos y Licencias - validar Binance/PagoMóvil/Zinli/BanescoPA, activar licencia 30 días con email bienvenida + PDF manual |
| 2026-03-14 | Respaldo DB: función exportar JSON completo empresa desde panel Master |
| 2026-03-14 | Cierre de Mes: botón 'Cerrar Mes' bloquea ediciones para integridad contable |
