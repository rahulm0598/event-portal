import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Stethoscope, Ticket, CheckCircle2, Wallet, ListChecks, Plus, UserCheck, Undo2, Search, Link2, Copy, Send, Megaphone } from 'lucide-react';
import { api } from '../api/client.js';
import ExportMenu from '../components/ExportMenu.jsx';

const inr = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export default function AdminDashboard() {
  const [ov, setOv] = useState(null);
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState(null);
  const [stats, setStats] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all'); // all | paid | checked | pending
  const [err, setErr] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [notice, setNotice] = useState('');
  const [acting, setActing] = useState('');
  const [confirm, setConfirm] = useState(null); // { type } pending broadcast
  const detailRef = useRef(null);

  // On mobile, the event detail panel renders far below the list — auto-scroll
  // to it when an event is picked so the user actually sees it.
  useEffect(() => {
    if (sel && detailRef.current && window.innerWidth < 1024) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [sel]);

  async function loadAll() {
    try {
      const [o, e] = await Promise.all([api.get('/admin/overview'), api.get('/events')]);
      setOv(o.data.overview); setEvents(e.data.events);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { loadAll(); }, []);

  async function select(ev) {
    setSel(ev); setStats(null); setAttendees([]); setQ(''); setFilter('all');
    setShareUrl(''); setNotice('');
    try {
      const [s, a] = await Promise.all([
        api.get(`/admin/events/${ev._id}/stats`),
        api.get(`/admin/events/${ev._id}/attendees`),
      ]);
      setStats(s.data.stats); setAttendees(a.data.attendees);
    } catch (e) { setErr(e.message); }
  }

  async function genLink() {
    setNotice(''); setErr('');
    try {
      const { data } = await api.post(`/admin/events/${sel._id}/share`);
      setShareUrl(data.url);
    } catch (e) { setErr(e.message); }
  }

  function copyLink() {
    if (shareUrl) { navigator.clipboard?.writeText(shareUrl); setNotice('Link copied to clipboard.'); }
  }

  // how many confirmed attendees still need each mail (haven't gotten it yet)
  const pending = useMemo(() => {
    const conf = attendees.filter((a) => a.emailVerified && a.paymentStatus !== 'pending');
    return {
      details: conf.filter((a) => !a.detailsEmailSentAt).length,
      followup: conf.filter((a) => !a.followupEmailSentAt).length,
      total: conf.length,
    };
  }, [attendees]);

  async function doBroadcast(type) {
    setConfirm(null); setActing(type); setNotice(''); setErr('');
    try {
      const { data } = await api.post(`/admin/events/${sel._id}/broadcast`, { type });
      const label = type === 'followup' ? 'Follow-up' : 'Event details';
      setNotice(data.sent > 0
        ? `${label}: sent to ${data.sent} new attendee(s). ${data.alreadySent} already had it.`
        : `${label}: everyone (${data.alreadySent}) already received it — nothing new to send.`);
      if (sel) select(sel); // refresh so the "already sent" stamps update
    } catch (e) { setErr(e.message); } finally { setActing(''); }
  }

  async function toggleCheckin(reg) {
    const want = reg.checkInStatus !== 'checked_in';
    try {
      const { data } = await api.post(`/admin/registrations/${reg._id}/checkin`, { checkedIn: want });
      setAttendees((list) => list.map((r) => r._id === reg._id
        ? { ...r, checkInStatus: data.checkInStatus, checkedInAt: data.checkedInAt } : r));
      if (sel) select(sel); // refresh stats
    } catch (e) { setErr(e.message); }
  }

  const filtered = useMemo(() => {
    return attendees.filter((r) => {
      const s = r.snapshot || {};
      const hit = !q || [s.name, s.doctorId, s.email, s.hospital].join(' ').toLowerCase().includes(q.toLowerCase());
      const fOk =
        filter === 'all' ? true :
        filter === 'paid' ? r.paymentStatus === 'paid' :
        filter === 'checked' ? r.checkInStatus === 'checked_in' :
        r.checkInStatus !== 'checked_in';
      return hit && fOk;
    });
  }, [attendees, q, filter]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold text-white">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Link to="/admin/registrations" className="btn-ghost flex-1 justify-center sm:flex-none"><ListChecks size={16} /> All Registrations</Link>
          <button onClick={() => setShowForm((s) => !s)} className="btn-primary flex-1 justify-center sm:flex-none">
            <Plus size={16} strokeWidth={2.5} /> {showForm ? 'Close' : 'New Event'}
          </button>
        </div>
      </div>
      {err && <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-red-300">{err}</div>}

      {/* GLOBAL KPIs */}
      {ov && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Kpi label="Events" value={ov.events} Icon={Calendar} tone="text-sky-400" />
          <Kpi label="Doctors" value={ov.doctors} Icon={Stethoscope} tone="text-violet-400" />
          <Kpi label="Registrations" value={ov.registrations} Icon={Ticket} tone="text-amber-400" />
          <Kpi label="Checked-In" value={ov.checkedIn} Icon={CheckCircle2} tone="text-emerald-400" />
          <Kpi label="Revenue" value={inr(ov.revenueInPaise)} Icon={Wallet} tone="text-accent" accent />
        </div>
      )}

      {showForm && <CreateEventForm onCreated={() => { setShowForm(false); loadAll(); }} />}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* event list + recent */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Events</div>
            {events.map((ev) => (
              <button key={ev._id} onClick={() => select(ev)}
                className={`w-full rounded-xl border p-3 text-left transition ${sel?._id === ev._id ? 'border-accent/50 bg-accent/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <div className="font-semibold text-slate-100">{ev.title}</div>
                <div className="text-xs text-slate-500">{new Date(ev.startsAt).toLocaleDateString('en-IN')} · {ev.isPaid ? inr(ev.priceInPaise) : 'Free'}</div>
              </button>
            ))}
          </div>

          {ov?.recent?.length > 0 && (
            <div className="card">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Recent activity</div>
              <div className="space-y-2">
                {ov.recent.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-slate-300">{r.name}</span>
                    <span className="text-xs text-slate-500">{r.event}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* detail */}
        <div ref={detailRef} className="scroll-mt-20 lg:col-span-2">
          {!sel ? (
            <div className="card text-slate-500">Select an event to view stats & attendees.</div>
          ) : (
            <div className="space-y-4">
              {/* SHARE LINK + BROADCASTS */}
              <div className="card space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{sel.title}</h3>
                  <span className="text-xs text-slate-500">{new Date(sel.startsAt).toLocaleDateString('en-IN')} · {sel.isPaid ? inr(sel.priceInPaise) : 'Free'}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={genLink} className="btn-ghost"><Link2 size={15} /> Generate share link</button>
                  <button onClick={() => setConfirm({ type: 'details' })} disabled={acting === 'details'} className="btn-ghost">
                    <Send size={15} /> {acting === 'details' ? 'Sending…' : 'Send event details (+QR)'}
                  </button>
                  <button onClick={() => setConfirm({ type: 'followup' })} disabled={acting === 'followup'} className="btn-ghost">
                    <Megaphone size={15} /> {acting === 'followup' ? 'Sending…' : 'Send follow-up'}
                  </button>
                </div>

                {shareUrl && (
                  <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 p-2">
                    <input readOnly value={shareUrl} className="input flex-1 text-xs" onFocus={(e) => e.target.select()} />
                    <button onClick={copyLink} className="btn-primary shrink-0 py-2"><Copy size={14} /> Copy</button>
                  </div>
                )}
                {shareUrl && <p className="text-xs text-slate-500">Share this on WhatsApp etc. Doctors open it to register (no login).</p>}
                {notice && <div className="rounded-xl bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">{notice}</div>}
              </div>

              {stats && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <Stat label="Registered" value={stats.total} />
                  <Stat label="Checked-In" value={stats.checkedIn} />
                  <Stat label="Paid" value={stats.paid} />
                  <Stat label="Pending" value={stats.pending} />
                  <Stat label="Revenue" value={inr(stats.revenueInPaise)} accent />
                </div>
              )}

              <div className="card">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-white">Attendees ({filtered.length})</h3>
                  <ExportMenu base={`/admin/events/${sel._id}/attendees`} filename={`attendees_${sel.title}`} />
                </div>

                {/* search + filter */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className="input pl-9" placeholder="Search name / ID / email / hospital"
                      value={q} onChange={(e) => setQ(e.target.value)} />
                  </div>
                  <div className="flex gap-1">
                    {['all', 'paid', 'checked', 'pending'].map((f) => (
                      <button key={f} onClick={() => setFilter(f)}
                        className={`chip capitalize ${filter === f ? 'bg-accent text-black' : 'bg-white/10 text-slate-300'}`}>{f}</button>
                    ))}
                  </div>
                </div>

                <div className="max-h-[28rem] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-panel text-left text-slate-500">
                      <tr><th className="py-2 font-medium">Name</th><th>ID</th><th>Pay</th><th>Check-In</th><th></th></tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {filtered.map((a) => (
                        <tr key={a._id} className="border-t border-white/5">
                          <td className="py-2">
                            <div className="font-medium text-slate-100">{a.snapshot?.name}</div>
                            <div className="text-xs text-slate-500">{a.snapshot?.specialty} · {a.snapshot?.hospital}</div>
                          </td>
                          <td className="text-xs">{a.snapshot?.doctorId}</td>
                          <td><span className={`chip ${a.paymentStatus === 'paid' || a.paymentStatus === 'not_required' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-amber-400/20 text-amber-300'}`}>{a.paymentStatus === 'not_required' ? 'free' : a.paymentStatus}</span></td>
                          <td>{a.checkInStatus === 'checked_in'
                            ? <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 size={14} /> In</span>
                            : <span className="text-slate-500">—</span>}</td>
                          <td className="text-right">
                            <button onClick={() => toggleCheckin(a)}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs hover:bg-white/10">
                              {a.checkInStatus === 'checked_in'
                                ? <><Undo2 size={13} /> Undo</>
                                : <><UserCheck size={13} /> Check in</>}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!filtered.length && <tr><td colSpan={5} className="py-4 text-center text-slate-500">No matching attendees.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM BROADCAST — guards against accidental clicks */}
      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setConfirm(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-panel p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">
              {confirm.type === 'followup' ? 'Send follow-up mail?' : 'Send event details (+QR)?'}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Emails <strong className="text-white">{pending[confirm.type]}</strong> attendee(s) of
              <strong className="text-white"> {sel?.title}</strong> who haven't received it yet
              <span className="text-slate-500"> ({pending.total - pending[confirm.type]} already got it).</span>
              {confirm.type !== 'followup' && ' Each gets their unique entry QR.'}
            </p>
            <p className="mt-2 text-xs text-amber-300">This cannot be undone — mails go out immediately.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirm(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={() => doBroadcast(confirm.type)} disabled={pending[confirm.type] === 0} className="btn-primary flex-1">
                {pending[confirm.type] === 0 ? 'Nothing new to send' : `Send to ${pending[confirm.type]} new`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, Icon, tone, accent }) {
  return (
    <div className={`card flex items-center gap-3 py-4 ${accent ? 'border-accent/30' : ''}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 ${tone}`}>
        <Icon size={20} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] leading-tight text-slate-500">{label}</div>
        <div className={`text-lg font-black sm:text-xl ${accent ? 'text-accent' : 'text-white'}`}>{value}</div>
      </div>
    </div>
  );
}
function Stat({ label, value, accent }) {
  return (
    <div className="card py-3 text-center">
      <div className={`text-xl font-black ${accent ? 'text-accent' : 'text-white'}`}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function CreateEventForm({ onCreated }) {
  const [f, setF] = useState({ title: '', description: '', venue: '', city: '', startsAt: '', isPaid: false, price: '', bannerUrl: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  async function submit(e) {
    e.preventDefault(); setErr('');
    try {
      await api.post('/admin/events', {
        title: f.title, description: f.description, venue: f.venue, city: f.city,
        startsAt: new Date(f.startsAt).toISOString(),
        isPaid: f.isPaid, priceInPaise: f.isPaid ? Math.round(Number(f.price) * 100) : 0,
        bannerUrl: f.bannerUrl || undefined,
      });
      onCreated();
    } catch (e) { setErr(e.message); }
  }
  return (
    <form onSubmit={submit} className="card mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {err && <div className="text-sm text-red-300 sm:col-span-2">{err}</div>}
      <input className="input" placeholder="Title" value={f.title} onChange={set('title')} required />
      <input className="input" placeholder="Venue" value={f.venue} onChange={set('venue')} />
      <input className="input" placeholder="City" value={f.city} onChange={set('city')} />
      <input className="input" type="datetime-local" value={f.startsAt} onChange={set('startsAt')} required />
      <input className="input sm:col-span-2" placeholder="Banner image URL (optional)" value={f.bannerUrl} onChange={set('bannerUrl')} />
      <textarea className="input sm:col-span-2" placeholder="Description" value={f.description} onChange={set('description')} />
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={f.isPaid} onChange={set('isPaid')} /> Paid event
      </label>
      {f.isPaid && <input className="input" type="number" placeholder="Price ₹" value={f.price} onChange={set('price')} />}
      <button className="btn-primary sm:col-span-2">Create Event</button>
    </form>
  );
}
