import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Building2, CalendarDays, Ticket, LinkIcon } from 'lucide-react';
import { api } from '../api/client.js';

// Public, read-only event page. Registration is NOT here anymore — doctors
// register through the private link the admin shares (/register/<token>).
export default function EventDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [event, setEvent] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/events/${id}`).then(({ data }) => setEvent(data.event)).catch((e) => setErr(e.message));
  }, [id]);

  if (err && !event) return <div className="rounded-xl bg-red-500/10 px-4 py-3 text-red-300">{err}</div>;
  if (!event) return <div className="animate-pulse text-slate-500">Loading…</div>;

  const price = event.isPaid ? `₹${(event.priceInPaise / 100).toFixed(0)}` : 'FREE';

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => nav('/')} className="mb-4 text-sm text-slate-400 hover:text-white">← All events</button>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-panel/60 shadow-2xl shadow-black/40">
        <div className="relative h-56">
          <div className="absolute inset-0 bg-gradient-to-br from-navy via-brand to-accent" />
          {event.bannerUrl && (
            <img src={event.bannerUrl} alt={event.title} onError={(e) => (e.currentTarget.style.display = 'none')}
              className="h-full w-full object-cover opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-panel to-transparent" />
          <span className={`chip absolute right-4 top-4 ${event.isPaid ? 'bg-amber-400 text-black' : 'bg-emerald-400 text-black'}`}>{price}</span>
          <h1 className="absolute bottom-4 left-5 right-5 text-3xl font-black text-white">{event.title}</h1>
        </div>

        <div className="p-6">
          <p className="text-slate-300">{event.description}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Info Icon={MapPin} label="Venue" value={event.venue} />
            <Info Icon={Building2} label="City" value={event.city} />
            <Info Icon={CalendarDays} label="Date" value={new Date(event.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
            <Info Icon={Ticket} label="Entry" value={price} />
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            <LinkIcon size={18} className="mt-0.5 shrink-0 text-accent" />
            <span>Registration for this event is <strong>by invitation</strong>. Open the registration link shared with you (e.g. on WhatsApp) to sign up.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ Icon, label, value }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500"><Icon size={13} /> {label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-200">{value || '—'}</div>
    </div>
  );
}
