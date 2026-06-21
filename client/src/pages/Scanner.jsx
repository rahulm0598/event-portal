import { useEffect, useRef, useState, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, Search, Maximize, CheckCircle2, AlertCircle, Printer, RotateCcw, CalendarDays, MapPin } from 'lucide-react';
import { api } from '../api/client.js';

// EVENT-DAY KIOSK. Run this on the laptop/tablet at the entrance, fullscreen.
// The device's own camera scans the QR shown on each doctor's phone.
// Two modes (like a real kiosk): QR Scan  +  Manual Search (no-QR fallback).
export default function Scanner() {
  const wrapRef = useRef(null);
  const scannerRef = useRef(null);
  const lockRef = useRef(false);

  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [mode, setMode] = useState('home');     // home | scan | manual
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  // manual search
  const [attendees, setAttendees] = useState([]);
  const [q, setQ] = useState('');

  const event = useMemo(() => events.find((e) => e._id === eventId), [events, eventId]);

  useEffect(() => {
    api.get('/events').then(({ data }) => {
      setEvents(data.events);
      if (data.events[0]) setEventId(data.events[0]._id);
    }).catch((e) => setErr(e.message));
  }, []);

  // ---- check-in by QR token (camera or pasted) ----
  async function check(raw) {
    if (lockRef.current || !raw) return;
    lockRef.current = true;
    setErr('');
    try {
      const { data } = await api.post('/scan', { qrToken: raw });
      setResult(data);
      setTimeout(() => setResult(null), 4500); // auto-clear, keep scanning
    } catch (e) {
      setErr(e.message);
      setTimeout(() => setErr(''), 3000);
    } finally {
      setTimeout(() => { lockRef.current = false; }, 1800);
    }
  }

  async function startScan() {
    setMode('scan'); setErr('');
    // wait a tick so #reader is mounted
    setTimeout(async () => {
      const scanner = new Html5Qrcode('reader', { verbose: false });
      scannerRef.current = scanner;
      const cfg = {
        fps: 15,
        // Square box ~70% of the smaller video side -> easy to aim on phones.
        qrbox: (vw, vh) => { const m = Math.floor(Math.min(vw, vh) * 0.7); return { width: m, height: m }; },
        aspectRatio: 1.0,
        // Use the browser's native BarcodeDetector when available — far faster
        // QR decoding on Android Chrome/Brave than the JS fallback.
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      };
      const msg = (e) => (typeof e === 'string' ? e : e?.message || e?.name || JSON.stringify(e));

      // Laptops usually have only a front cam, so 'environment' can fail.
      // Try rear -> front -> explicit device id from the camera list.
      try {
        await scanner.start({ facingMode: 'environment' }, cfg, (d) => check(d), () => {});
        return setScanning(true);
      } catch (e1) {
        try {
          await scanner.start({ facingMode: 'user' }, cfg, (d) => check(d), () => {});
          return setScanning(true);
        } catch (e2) {
          try {
            const cams = await Html5Qrcode.getCameras(); // also triggers the permission prompt
            if (!cams?.length) throw new Error('No camera found on this device');
            await scanner.start(cams[cams.length - 1].id, cfg, (d) => check(d), () => {});
            return setScanning(true);
          } catch (e3) {
            setErr('Camera error: ' + msg(e3 || e2 || e1) + ' — allow camera permission (lock icon in the address bar) or use Manual Search.');
          }
        }
      }
    }, 60);
  }
  async function teardown() {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try {
      if (s.getState?.() === 2 /* SCANNING */) await s.stop();
    } catch {}
    try { s.clear?.(); } catch {}
  }
  async function stopScan() {
    await teardown(); setScanning(false); setMode('home'); setResult(null);
  }
  // Stop the camera before this component unmounts (e.g. user clicks Events),
  // otherwise html5-qrcode mutates the DOM React is removing -> blank screen.
  useEffect(() => () => { teardown(); }, []);

  // ---- manual search ----
  async function openManual() {
    setMode('manual'); setErr(''); setQ('');
    if (!eventId) return;
    try {
      const { data } = await api.get(`/admin/events/${eventId}/attendees`);
      setAttendees(data.attendees);
    } catch (e) { setErr(e.message); }
  }
  async function manualCheckIn(reg) {
    try {
      const { data } = await api.post(`/admin/registrations/${reg._id}/checkin`, { checkedIn: true });
      setAttendees((l) => l.map((r) => r._id === reg._id ? { ...r, checkInStatus: data.checkInStatus, checkedInAt: data.checkedInAt } : r));
      setResult({ doctor: reg.snapshot, event: { title: event?.title }, checkedInAt: data.checkedInAt, registrationId: reg._id, alreadyCheckedIn: reg.checkInStatus === 'checked_in' });
      setTimeout(() => setResult(null), 4500);
    } catch (e) { setErr(e.message); }
  }
  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return attendees.filter((r) => !t || [r.snapshot?.name, r.snapshot?.doctorId, r.snapshot?.email, r.snapshot?.mobile].join(' ').toLowerCase().includes(t));
  }, [attendees, q]);

  async function printBadge(regId) {
    try {
      const res = await api.get(`/badges/${regId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { setErr(e.message); }
  }

  function goFullscreen() {
    const el = wrapRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  return (
    <div ref={wrapRef} className="mx-auto max-w-2xl rounded-3xl bg-ink">
      {/* EVENT HEADER (blue gradient, like the kiosk) */}
      <div className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
        <div className="relative bg-gradient-to-br from-navy via-brand to-accent px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-white/70">Check-In Kiosk</div>
              <h1 className="mt-1 text-2xl font-black text-white">{event?.title || 'Select an event'}</h1>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/80">
                {event && <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> {new Date(event.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                {event && <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {event.venue || event.city || 'Venue TBA'}</span>}
              </div>
            </div>
            <button onClick={goFullscreen} title="Fullscreen" className="rounded-lg bg-white/15 p-2 text-white hover:bg-white/25"><Maximize size={16} /></button>
          </div>
          {/* event picker */}
          <select value={eventId} onChange={(e) => { setEventId(e.target.value); setMode('home'); }}
            className="mt-3 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none [&>option]:text-black">
            {events.map((e) => <option key={e._id} value={e._id}>{e.title}</option>)}
          </select>
        </div>

        {/* BODY */}
        <div className="bg-panel/60 p-6">
          {/* HOME: two big buttons */}
          {mode === 'home' && (
            <div className="space-y-4">
              <KioskButton onClick={openManual} Icon={Search} title="Manual Search" sub="Find by name / ID and check in" />
              <KioskButton onClick={startScan} Icon={ScanLine} title="QR Scan" sub="Hold the phone's QR to the camera" primary />
            </div>
          )}

          {/* SCAN */}
          {mode === 'scan' && (
            <div>
              <div id="reader" className="overflow-hidden rounded-2xl bg-black [&_video]:rounded-2xl" />
              <button onClick={stopScan} className="btn-ghost mt-4 w-full"><RotateCcw size={15} /> Back</button>
              <div className="mt-3 border-t border-white/10 pt-3">
                <label className="label">USB scanner / paste token</label>
                <input className="input" placeholder="EVT-… or scan URL" onKeyDown={(e) => e.key === 'Enter' && check(e.target.value)} />
              </div>
              {!scanning && !err && <p className="mt-3 text-center text-sm text-slate-400">Starting camera…</p>}
            </div>
          )}

          {/* MANUAL */}
          {mode === 'manual' && (
            <div>
              <div className="relative mb-3">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input autoFocus className="input pl-9" placeholder="Search name / ID / mobile / email" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="max-h-[24rem] space-y-2 overflow-auto">
                {filtered.map((r) => (
                  <div key={r._id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-white">{r.snapshot?.name}</div>
                      <div className="truncate text-xs text-slate-500">{r.snapshot?.doctorId} · {r.snapshot?.specialty}</div>
                    </div>
                    {r.checkInStatus === 'checked_in'
                      ? <span className="chip bg-emerald-400/20 text-emerald-300">In ✓</span>
                      : <button onClick={() => manualCheckIn(r)} className="btn-primary shrink-0 py-2">Check in</button>}
                  </div>
                ))}
                {!filtered.length && <div className="py-6 text-center text-slate-500">No attendees match.</div>}
              </div>
              <button onClick={() => setMode('home')} className="btn-ghost mt-4 w-full"><RotateCcw size={15} /> Back</button>
            </div>
          )}

          {err && <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300"><AlertCircle size={16} /> {err}</div>}
        </div>
      </div>

      {/* BIG RESULT OVERLAY */}
      {result && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setResult(null)}>
          <div className={`w-full max-w-md rounded-3xl border-2 bg-panel p-8 text-center shadow-2xl ${result.alreadyCheckedIn ? 'border-amber-400' : 'border-emerald-400'}`}>
            {result.alreadyCheckedIn
              ? <AlertCircle className="mx-auto text-amber-400" size={56} />
              : <CheckCircle2 className="mx-auto text-emerald-400" size={56} />}
            <div className={`mt-2 text-sm font-bold uppercase tracking-widest ${result.alreadyCheckedIn ? 'text-amber-400' : 'text-emerald-400'}`}>
              {result.alreadyCheckedIn ? 'Already Checked-In' : 'Checked In'}
            </div>
            <div className="mt-3 text-4xl font-black text-white">{result.doctor?.name}</div>
            <div className="mt-1 text-slate-300">{result.doctor?.specialty} · {result.doctor?.hospital}</div>
            <div className="mt-1 text-sm text-accent">ID: {result.doctor?.doctorId}</div>
            <div className="mt-1 text-xs text-slate-500">{result.event?.title}</div>
            <div className="mt-5 flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); printBadge(result.registrationId); }} className="btn-ghost flex-1"><Printer size={15} /> Badge</button>
              <button onClick={(e) => { e.stopPropagation(); setResult(null); }} className="btn-primary flex-1">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KioskButton({ onClick, Icon, title, sub, primary }) {
  return (
    <button onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${
        primary ? 'border-accent/40 bg-accent/10 hover:bg-accent/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${primary ? 'bg-accent text-black' : 'bg-white/10 text-accent'}`}>
        <Icon size={26} strokeWidth={2.2} />
      </span>
      <span>
        <span className="block text-lg font-bold text-white">{title}</span>
        <span className="block text-sm text-slate-400">{sub}</span>
      </span>
    </button>
  );
}
