'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BotonSeniat } from './BotonSeniat';

interface SidebarProps {
  rol: string;
  nombre: string;
  empresaNombre?: string;
}

const ICONS = {
  dashboard: (
    <svg className='icon' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <rect x='3' y='3' width='7' height='7' rx='1' strokeWidth='2' />
      <rect x='14' y='3' width='7' height='7' rx='1' strokeWidth='2' />
      <rect x='3' y='14' width='7' height='7' rx='1' strokeWidth='2' />
      <rect x='14' y='14' width='7' height='7' rx='1' strokeWidth='2' />
    </svg>
  ),
  workers: (
    <svg className='icon' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' strokeWidth='2' />
      <circle cx='9' cy='7' r='4' strokeWidth='2' />
      <path d='M23 21v-2a4 4 0 0 0-3-3.87' strokeWidth='2' />
      <path d='M16 3.13a4 4 0 0 1 0 7.75' strokeWidth='2' />
    </svg>
  ),
  nomina: (
    <svg className='icon' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' strokeWidth='2' />
      <polyline points='14,2 14,8 20,8' strokeWidth='2' />
      <line x1='16' y1='13' x2='8' y2='13' strokeWidth='2' />
      <line x1='16' y1='17' x2='8' y2='17' strokeWidth='2' />
      <polyline points='10,9 9,9 8,9' strokeWidth='2' />
    </svg>
  ),
  prestaciones: (
    <svg className='icon' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <line x1='12' y1='1' x2='12' y2='23' strokeWidth='2' />
      <path d='M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' strokeWidth='2' />
    </svg>
  ),
  vacaciones: (
    <svg className='icon' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <rect x='3' y='4' width='18' height='18' rx='2' ry='2' strokeWidth='2' />
      <line x1='16' y1='2' x2='16' y2='6' strokeWidth='2' />
      <line x1='8' y1='2' x2='8' y2='6' strokeWidth='2' />
      <line x1='3' y1='10' x2='21' y2='10' strokeWidth='2' />
    </svg>
  ),
  tasas: (
    <svg className='icon' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <polyline points='23 6 13.5 15.5 8.5 10.5 1 18' strokeWidth='2' />
      <polyline points='17 6 23 6 23 12' strokeWidth='2' />
    </svg>
  ),
  reportes: (
    <svg className='icon' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' strokeWidth='2' />
      <polyline points='7 10 12 15 17 10' strokeWidth='2' />
      <line x1='12' y1='15' x2='12' y2='3' strokeWidth='2' />
    </svg>
  ),
  config: (
    <svg className='icon' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <circle cx='12' cy='12' r='3' strokeWidth='2' />
      <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' strokeWidth='2' />
    </svg>
  ),
  companies: (
    <svg className='icon' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' strokeWidth='2' />
      <polyline points='9 22 9 12 15 12 15 22' strokeWidth='2' />
    </svg>
  ),
  payments: (
    <svg className='icon' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <rect x='1' y='4' width='22' height='16' rx='2' ry='2' strokeWidth='2' />
      <line x1='1' y1='10' x2='23' y2='10' strokeWidth='2' />
    </svg>
  ),
  logout: (
    <svg className='icon' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' strokeWidth='2' />
      <polyline points='16 17 21 12 16 7' strokeWidth='2' />
      <line x1='21' y1='12' x2='9' y2='12' strokeWidth='2' />
    </svg>
  ),
};

export default function Sidebar({ rol, nombre, empresaNombre }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const isMaster = rol === 'master';
  const isAdmin = rol === 'admin';
  const isAnalista = rol === 'analista';

  return (
    <aside className='sidebar'>
      <div className='sidebar-logo'>
        Nómina Venezuela
        <span>{isMaster ? 'Panel Master' : empresaNombre || 'Empresa'}</span>
      </div>

      <nav className='sidebar-nav'>
        {isMaster ? (
          <>
            <div className='sidebar-section'>Master</div>
            <Link href='/master' className={`sidebar-link ${isActive('/master') && pathname === '/master' ? 'active' : ''}`}>
              {ICONS.dashboard} Dashboard Master
            </Link>
            <Link href='/master/empresas' className={`sidebar-link ${isActive('/master/empresas') ? 'active' : ''}`}>
              {ICONS.companies} Empresas
            </Link>
            <Link href='/master/pagos' className={`sidebar-link ${isActive('/master/pagos') ? 'active' : ''}`}>
              {ICONS.payments} Pagos de Licencias
            </Link>
            <Link href='/master/tasas' className={`sidebar-link ${isActive('/master/tasas') ? 'active' : ''}`}>
              {ICONS.tasas} Tasas BCV
            </Link>
          </>
        ) : (
          <>
            <div className='sidebar-section'>Principal</div>
            <Link href='/dashboard' className={`sidebar-link ${pathname === '/dashboard' ? 'active' : ''}`}>
              {ICONS.dashboard} Dashboard
            </Link>

            {(isAdmin || isAnalista) && (
              <>
                <div className='sidebar-section'>Nómina</div>
                <Link href='/dashboard/trabajadores' className={`sidebar-link ${isActive('/dashboard/trabajadores') ? 'active' : ''}`}>
                  {ICONS.workers} Trabajadores
                </Link>
                <Link href='/dashboard/nomina' className={`sidebar-link ${isActive('/dashboard/nomina') ? 'active' : ''}`}>
                  {ICONS.nomina} Procesamiento
                </Link>
                <Link href='/dashboard/prestaciones' className={`sidebar-link ${isActive('/dashboard/prestaciones') ? 'active' : ''}`}>
                  {ICONS.prestaciones} Prestaciones
                </Link>
                <Link href='/dashboard/vacaciones' className={`sidebar-link ${isActive('/dashboard/vacaciones') ? 'active' : ''}`}>
                  {ICONS.vacaciones} Vacaciones
                </Link>
              </>
            )}

            <BotonSeniat />

            <div className='sidebar-section'>Reportes</div>
            <Link href='/dashboard/reportes' className={`sidebar-link ${isActive('/dashboard/reportes') ? 'active' : ''}`}>
              {ICONS.reportes} Reportes y Archivos
            </Link>

            <div className='sidebar-section'>Sistema</div>
            <Link href='/dashboard/tasas' className={`sidebar-link ${isActive('/dashboard/tasas') ? 'active' : ''}`}>
              {ICONS.tasas} Tasas BCV
            </Link>
            <Link href='/dashboard/ayuda' className={`sidebar-link ${isActive('/dashboard/ayuda') ? 'active' : ''}`}>
              {ICONS.config} Centro de Ayuda
            </Link>

            {isAdmin && (
              <Link href='/dashboard/configuracion' className={`sidebar-link ${isActive('/dashboard/configuracion') ? 'active' : ''}`}>
                {ICONS.config} Configuración
              </Link>
            )}
          </>
        )}
      </nav>

      <div className='sidebar-footer'>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '12px' }}>{nombre}</div>
          <div style={{ fontSize: '11px', textTransform: 'capitalize' }}>
            {rol === 'master'
              ? 'Administrador Master'
              : rol === 'admin'
              ? 'Admin de Empresa'
              : rol === 'analista'
              ? 'Analista de Nómina'
              : 'Trabajador'}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className='sidebar-link'
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          {ICONS.logout} Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
