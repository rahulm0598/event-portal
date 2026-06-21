import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, MapPin, CheckCircle2, Mail, ShieldCheck, BadgeCheck } from 'lucide-react';
import { api } from '../api/client.js';
import FakeRazorpay from '../components/FakeRazorpay.jsx';

// PUBLIC link-based registration. Doctors arrive here from a link the admin
// shared (WhatsApp etc). No login, no password.
// Flow:  form -> email code -> (payment if paid) -> success (NO QR here).
export default function Register() {
  const { token } = useParams();
  const [event, setEvent] = useState(null);
  const [loadErr, setLoadErr] = useState('');

  const [step, setStep] = useState('form'); // form | verify | pay | done
  const [f, setF] = useState({ name: '', doctorId: '', mobile: '', email: '', hospital: '', specialty: '', city: '' });
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [regId, setRegId] = useState(null);
  const [amount, setAmount] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPay, setShowPay] = useState(false);

  useEffect(() => {
    api.get(`/public/events/${token}`)
      .then(({ data }) => setEvent(data.event))
      .catch((e) => setLoadErr(e.message));
  }, [token]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submitForm(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const { data } = await api.post(`/public/events/${token}/register`, f);
      setRegId(data.registrationId);
      setAmount(data.amountInPaise || 0);
      setDevCode(data.devCode || '');
      setStep('verify');
    } catch (e) {
      // Already registered for this event with this email -> block, clean screen.
      if (e.response?.status === 409) setStep('already');
      else setErr(fieldErr(e));
    } finally { setBusy(false); }
  }

  async function submitCode(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const { data } = await api.post(`/public/events/${token}/verify`, { email: f.email, code });
      if (data.status === 'payment_required') {
        setRegId(data.registrationId);
        setAmount(data.amountInPaise);
        setShowPay(true);          // open fake Razorpay
      } else {
        setStep('done');           // free event -> confirmed
      }
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function pay() {
    setBusy(true); setErr('');
    try {
      await api.post('/public/pay', { registrationId: regId });
      setShowPay(false);
      setStep('done');
    } catch (e) { setErr(e.message); setShowPay(false); } finally { setBusy(false); }
  }

  async function resend() {
    setErr('');
    try {
      const { data } = await api.post(`/public/events/${token}/resend`, { email: f.email });
      setDevCode(data.devCode || '');
    } catch (e) { setErr(e.message); }
  }

  if (loadErr) return <Shell><div className="card text-center text-red-300">{loadErr}</div></Shell>;
  if (!event) return <Shell><div className="card animate-pulse text-slate-500">Loading…</div></Shell>;

  const price = event.isPaid ? `₹${(event.priceInPaise / 100).toLocaleString('en-IN')}` : 'FREE';
  const when = new Date(event.startsAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Shell>
      {/* event banner */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-panel/60 shadow-2xl">
        <div className="relative h-40">
          <div className="absolute inset-0 bg-gradient-to-br from-navy via-brand to-accent" />
          {event.bannerUrl && (
            <img src={event.bannerUrl} alt="" onError={(e) => (e.currentTarget.style.display = 'none')}
              className="h-full w-full object-cover opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-panel to-transparent" />
          <span className={`chip absolute right-4 top-4 ${event.isPaid ? 'bg-amber-400 text-black' : 'bg-emerald-400 text-black'}`}>{price}</span>
          <h1 className="absolute bottom-3 left-5 right-5 text-2xl font-black text-white">{event.title}</h1>
        </div>
        <div className="flex flex-wrap gap-4 px-5 py-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> {when}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {event.venue || 'TBA'}</span>
        </div>
      </div>

      <div className="mt-5">
        {step === 'form' && (
          <form onSubmit={submitForm} className="card grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h2 className="text-lg font-bold text-white">Register for this event</h2>
              <p className="text-sm text-slate-400">Fill your details — we'll email a verification code.</p>
            </div>
            {err && <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:col-span-2">{err}</div>}
            <Field label="Full name" value={f.name} onChange={set('name')} required />
            <Field label="Doctor / Reg. ID" value={f.doctorId} onChange={set('doctorId')} required />
            <Field label="Mobile (10-digit)" value={f.mobile} onChange={set('mobile')} required />
            <Field label="Email" type="email" value={f.email} onChange={set('email')} required />
            <Field label="Hospital / Clinic" value={f.hospital} onChange={set('hospital')} required />
            <Field label="Specialty" value={f.specialty} onChange={set('specialty')} required />
            <Field label="City" value={f.city} onChange={set('city')} />
            <div className="sm:col-span-2">
              <button className="btn-primary w-full" disabled={busy}>
                {busy ? 'Sending code…' : event.isPaid ? `Continue · ${price}` : 'Continue'}
              </button>
            </div>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={submitCode} className="card mx-auto max-w-md text-center">
            <Mail className="mx-auto text-accent" size={32} />
            <h2 className="mt-2 text-lg font-bold text-white">Verify your email</h2>
            <p className="text-sm text-slate-400">Enter the 6-digit code sent to <strong className="text-slate-200">{f.email}</strong></p>
            {devCode && (
              <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                Demo code: <strong className="tracking-widest">{devCode}</strong>
              </div>
            )}
            {err && <div className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{err}</div>}
            <input className="input mt-4 text-center text-2xl tracking-[0.5em]" maxLength={6}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
            <button className="btn-primary mt-4 w-full" disabled={busy || code.length !== 6}>
              {busy ? 'Verifying…' : event.isPaid ? 'Verify & Pay' : 'Verify & Register'}
            </button>
            <button type="button" onClick={resend} className="mt-3 text-xs font-semibold text-accent">Resend code</button>
          </form>
        )}

        {step === 'already' && (
          <div className="card mx-auto max-w-md text-center">
            <BadgeCheck className="mx-auto text-amber-400" size={48} />
            <h2 className="mt-3 text-xl font-extrabold text-white">Already registered</h2>
            <p className="mt-2 text-slate-300">
              The email <strong>{f.email}</strong> is already registered for <strong>{event.title}</strong>.
              You can register only once per event.
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Your entry pass &amp; event details will reach this email about 2 days before the event.
            </p>
          </div>
        )}

        {step === 'done' && (
          <div className="card mx-auto max-w-md text-center">
            <CheckCircle2 className="mx-auto text-emerald-400" size={48} />
            <h2 className="mt-3 text-xl font-extrabold text-white">You're registered! 🎉</h2>
            <p className="mt-2 text-slate-300">
              Thank you, <strong>{f.name}</strong>. Your registration for <strong>{event.title}</strong> is confirmed
              {event.isPaid && <> and your payment was received</>}.
            </p>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-left text-sm text-slate-300">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-accent" />
              <span>We'll email you the <strong>full event details and your entry pass</strong> about <strong>2 days before</strong> the event. A confirmation has been sent to {f.email}.</span>
            </div>
          </div>
        )}
      </div>

      {showPay && (
        <FakeRazorpay
          amount={amount}
          eventTitle={event.title}
          prefill={{ email: f.email, name: f.name }}
          onPaid={pay}
          onClose={() => setShowPay(false)}
        />
      )}
    </Shell>
  );
}

// Turn a backend "Validation failed" into a readable, field-level message.
function fieldErr(e) {
  const det = e.data?.error?.details;
  if (det && typeof det === 'object') {
    const parts = Object.entries(det).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
    if (parts.length) return parts.join(' · ');
  }
  return e.message;
}

function Shell({ children }) {
  return <main className="mx-auto max-w-2xl px-5 py-10">{children}</main>;
}

function Field({ label, type = 'text', value, onChange, required }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-accent"> *</span>}</label>
      <input className="input" type={type} value={value} onChange={onChange} required={required} />
    </div>
  );
}
