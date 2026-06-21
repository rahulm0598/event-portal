import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, Ticket, ScanLine, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { doctor, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  if (loc.pathname.startsWith('/checkin/')) return null;

  const link = (to, label, Icon) => (
    <Link to={to} title={label} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm transition sm:px-3 ${
      loc.pathname === to ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'
    }`}>
      <Icon size={16} strokeWidth={2} /> <span className="hidden sm:inline">{label}</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-5">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-extrabold tracking-tight text-white">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand to-accent shadow-lg shadow-brand/40 sm:h-9 sm:w-9">
            <Activity size={18} className="text-white" strokeWidth={2.5} />
          </span>
          <span>MedEvents</span>
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1">
          {link('/', 'Events', Ticket)}
          {doctor?.role === 'admin' && (
            <>
              {link('/scan', 'Scan', ScanLine)}
              {link('/admin', 'Admin', LayoutDashboard)}
            </>
          )}
          {doctor && (
            <div className="ml-1 flex items-center gap-2 sm:ml-2 sm:gap-3">
              <span className="hidden text-xs text-slate-400 sm:block">{doctor.name?.split(' ')[0]}</span>
              <button onClick={() => { logout(); nav('/'); }} title="Logout"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">
                <LogOut size={15} /> <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
