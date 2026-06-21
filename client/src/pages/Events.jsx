import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/events').then(({ data }) => setEvents(data.events)).catch((e) => setErr(e.message));
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/3 top-0 h-72 w-72 animate-float rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute right-10 top-20 h-64 w-64 animate-float rounded-full bg-accent/20 blur-3xl" style={{ animationDelay: '1.5s' }} />
        </div>
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-10 text-center">
          <span className="chip glass mb-5 inline-block animate-fadeUp text-accent">⚡ India’s Premier Medical Events</span>
          <h1 className="animate-fadeUp text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl" style={{ animationDelay: '0.05s' }}>
            Where doctors meet<br />
            <span className="bg-gradient-to-r from-brand via-accent to-brand bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">the future of medicine</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl animate-fadeUp text-slate-400" style={{ animationDelay: '0.1s' }}>
            Conferences, CMEs & masterclasses — all in one premium portal. Registration is by invitation: open the link shared with you to sign up.
          </p>
          <div className="mt-7 flex animate-fadeUp justify-center gap-3" style={{ animationDelay: '0.15s' }}>
            <a href="#events" className="btn-primary">Explore Events</a>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section id="events" className="mx-auto max-w-6xl px-5 pb-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold text-white">Upcoming Events</h2>
          <span className="text-sm text-slate-500">{events.length} events</span>
        </div>
        {err && <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{err}</div>}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev, i) => <EventCard key={ev._id} ev={ev} i={i} />)}
        </div>
      </section>
    </div>
  );
}

function EventCard({ ev, i }) {
  const price = ev.isPaid ? `₹${(ev.priceInPaise / 100).toFixed(0)}` : 'FREE';
  return (
    <Link
      to={`/events/${ev._id}`}
      className="group animate-fadeUp overflow-hidden rounded-2xl border border-white/10 bg-panel/60 shadow-xl shadow-black/40 transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-accent/10"
      style={{ animationDelay: `${0.05 * i}s` }}
    >
      <div className="relative h-44 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-brand to-accent" />
        {ev.bannerUrl && (
          <img
            src={ev.bannerUrl}
            alt={ev.title}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-110 group-hover:opacity-90"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/10 to-transparent" />
        <span className={`chip absolute right-3 top-3 ${ev.isPaid ? 'bg-amber-400 text-black' : 'bg-emerald-400 text-black'}`}>{price}</span>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-white group-hover:text-accent">{ev.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-slate-400">{ev.description}</p>
        <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
          <span>📍 {ev.city}</span>
          <span>🗓 {new Date(ev.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>
    </Link>
  );
}
