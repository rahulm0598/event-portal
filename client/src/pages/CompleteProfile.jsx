import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function CompleteProfile() {
  const { setSession, refresh } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({
    mobile: loc.state?.mobile || '',
    doctorId: '', name: '', email: '', hospital: '', specialty: '', city: '',
  });
  const [photo, setPhoto] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!photo) { setErr('Photo is required for your event badge.'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('photo', photo);
      const { data } = await api.post('/auth/complete-profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSession(data.token, data.doctor);
      await refresh();
      nav('/');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="card">
        <h1 className="mb-1 text-xl font-bold text-navy">Complete Your Profile</h1>
        <p className="mb-4 text-sm text-slate-500">This data prints on your event badge.</p>
        {err && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}

        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full name" value={form.name} onChange={set('name')} required />
          <Field label="Doctor / Reg ID" value={form.doctorId} onChange={set('doctorId')} required />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} required />
          <Field label="Mobile" value={form.mobile} onChange={set('mobile')} required />
          <Field label="Hospital / Institution" value={form.hospital} onChange={set('hospital')} required />
          <Field label="Specialty" value={form.specialty} onChange={set('specialty')} required />
          <Field label="City" value={form.city} onChange={set('city')} />
          <div>
            <label className="label">Photo (required)</label>
            <input type="file" accept="image/*" className="input" onChange={(e) => setPhoto(e.target.files[0])} required />
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Save & Continue'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" {...props} />
    </div>
  );
}
