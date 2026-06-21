import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, API_BASE } from '../api/client.js';
import BadgeCard from '../components/BadgeCard.jsx';

// PUBLIC page. Any phone that scans the QR lands here:  /checkin/<token>
// Shows the attendee + badge, lets gate staff confirm check-in and print.
export default function Checkin() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get(`/public/checkin/${token}`)
      .then(({ data }) => setData(data))
      .catch((e) => setErr(e.message));
  }, [token]);

  async function confirm() {
    setBusy(true); setErr('');
    try {
      const { data: r } = await api.post(`/public/checkin/${token}`);
      setResult(r);
      setData((d) => ({ ...d, checkInStatus: 'checked_in', checkedInAt: r.checkedInAt }));
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  function printBadge() {
    window.open(`${API_BASE}/api/public/badge/${token}/pdf`, '_blank');
  }

  if (err && !data) return <Center><p className="text-red-600">{err}</p></Center>;
  if (!data) return <Center><p className="text-slate-400">Loading…</p></Center>;

  const isIn = data.checkInStatus === 'checked_in';

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 text-center">
        <span className={`chip ${isIn ? 'bg-emerald-400/20 text-emerald-300' : 'bg-amber-400/20 text-amber-300'}`}>
          {isIn ? '✓ Checked-In' : 'Not checked in yet'}
        </span>
      </div>

      <BadgeCard doctor={data.doctor} eventTitle={data.event?.title} />

      <div className="mt-5 card text-sm">
        <Row k="Name" v={data.doctor?.name} />
        <Row k="Doctor ID" v={data.doctor?.doctorId} />
        <Row k="Specialty" v={data.doctor?.specialty} />
        <Row k="Hospital" v={data.doctor?.hospital} />
        <Row k="Email" v={data.doctor?.email} />
        <Row k="Event" v={data.event?.title} />
        <Row k="Payment" v={data.paymentStatus} />
        {data.checkedInAt && <Row k="Checked in at" v={new Date(data.checkedInAt).toLocaleString('en-IN')} />}
      </div>

      {err && <div className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</div>}
      {result?.alreadyCheckedIn && <div className="mt-3 rounded-xl bg-amber-400/10 px-3 py-2 text-sm text-amber-300">Was already checked in.</div>}

      <div className="mt-4 flex gap-2">
        {!isIn && (
          <button onClick={confirm} disabled={busy} className="btn-primary flex-1">
            {busy ? 'Checking in…' : 'Confirm Check-In'}
          </button>
        )}
        <button onClick={printBadge} className="btn-ghost flex-1">Print Badge (PDF)</button>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-1.5 last:border-0">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium text-slate-200">{v || '—'}</span>
    </div>
  );
}

function Center({ children }) {
  return <div className="grid min-h-[40vh] place-items-center">{children}</div>;
}
