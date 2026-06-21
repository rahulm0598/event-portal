import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client.js';
import ExportMenu from '../components/ExportMenu.jsx';

const inr = (p) => `₹${((p || 0) / 100).toLocaleString('en-IN')}`;

export default function AllRegistrations() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all'); // all | paid | checked | pending
  const [eventName, setEventName] = useState('all');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/admin/registrations').then(({ data }) => setRows(data.registrations)).catch((e) => setErr(e.message));
  }, []);

  const eventNames = useMemo(() => ['all', ...Array.from(new Set(rows.map((r) => r.event)))], [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    const hit = !q || [r.name, r.doctorId, r.email, r.hospital, r.mobile].join(' ').toLowerCase().includes(q.toLowerCase());
    const ev = eventName === 'all' || r.event === eventName;
    const f =
      filter === 'all' ? true :
      filter === 'paid' ? r.paymentStatus === 'paid' :
      filter === 'checked' ? r.checkInStatus === 'checked_in' :
      r.checkInStatus !== 'checked_in';
    return hit && ev && f;
  }), [rows, q, filter, eventName]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">All Registrations</h1>
          <p className="text-sm text-slate-400">{rows.length} total · {filtered.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin" className="btn-ghost py-2 text-sm"><ArrowLeft size={15} /> Dashboard</Link>
          <ExportMenu base="/admin/registrations" filename="all_registrations" />
        </div>
      </div>
      {err && <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-red-300">{err}</div>}

      {/* controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Search name / ID / email / mobile / hospital"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={eventName} onChange={(e) => setEventName(e.target.value)}>
          {eventNames.map((n) => <option key={n} value={n}>{n === 'all' ? 'All events' : n}</option>)}
        </select>
        <div className="flex gap-1">
          {['all', 'paid', 'checked', 'pending'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`chip capitalize ${filter === f ? 'bg-accent text-black' : 'bg-white/10 text-slate-300'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-panel text-left text-slate-500">
            <tr>
              <th className="py-2 font-medium">Doctor</th><th>Mobile</th><th>Email</th>
              <th>Event</th><th>Payment</th><th>Check-In</th><th>Registered</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="py-2">
                  <div className="font-medium text-slate-100">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.doctorId} · {r.specialty} · {r.hospital}</div>
                </td>
                <td className="text-xs">{r.mobile}</td>
                <td className="text-xs">{r.email}</td>
                <td className="text-xs">{r.event}</td>
                <td>
                  <span className={`chip ${['paid', 'not_required'].includes(r.paymentStatus) ? 'bg-emerald-400/20 text-emerald-300' : 'bg-amber-400/20 text-amber-300'}`}>
                    {r.paymentStatus === 'not_required' ? 'free' : r.paymentStatus}
                  </span>
                  {r.amountInPaise > 0 && <div className="mt-0.5 text-[10px] text-slate-500">{inr(r.amountInPaise)}</div>}
                </td>
                <td>{r.checkInStatus === 'checked_in'
                  ? <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 size={14} /> In</span>
                  : <span className="text-slate-500">—</span>}</td>
                <td className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="py-6 text-center text-slate-500">No registrations.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
