import { UserRound } from 'lucide-react';

// On-screen badge that mirrors the printed PDF design:
// blue gradient top, circular photo, NAME, specialty • hospital, QR at bottom.
export default function BadgeCard({ doctor, eventTitle, qr }) {
  const photo = doctor?.photo ? `/uploads/${doctor.photo.split(/[\\/]/).pop()}` : null;
  const subtitle = [doctor?.specialty, doctor?.hospital].filter(Boolean).join(' • ');

  return (
    <div className="mx-auto w-[260px] overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
      {/* top gradient band */}
      <div className="relative h-36 bg-gradient-to-br from-navy via-brand to-accent">
        <div className="px-3 pt-4 text-center">
          <div className="line-clamp-2 text-[13px] font-bold uppercase leading-tight tracking-wide text-white">
            {eventTitle || 'EVENT PORTAL'}
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.3em] text-blue-100">
            Medical Conference ID
          </div>
        </div>
        {/* photo circle straddling the divider */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-white p-1 shadow-md ring-4 ring-white">
            {photo ? (
              <img src={photo} alt={doctor?.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center rounded-full bg-slate-100 text-slate-400">
                <UserRound size={44} strokeWidth={1.6} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-5 pt-16 text-center">
        <div className="text-lg font-bold uppercase tracking-wide text-slate-800">
          {doctor?.name || 'NAME SURNAME'}
        </div>
        <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
          {subtitle || 'Delegate'}
        </div>
        {doctor?.doctorId && (
          <div className="mt-1 text-xs font-semibold text-brand">ID: {doctor.doctorId}</div>
        )}
        {qr && <img src={qr} alt="QR" className="mx-auto mt-4 h-24 w-24" />}
      </div>
    </div>
  );
}
