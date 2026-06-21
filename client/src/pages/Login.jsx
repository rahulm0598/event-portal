import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { setSession, refresh } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const next = loc.state?.next || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setSession(data.token, data.doctor);
      await refresh();
      nav(next);
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-md animate-fadeUp">
      <div className="card">
        <div className="flex items-center gap-2 text-accent"><ShieldCheck size={20} /><span className="text-xs font-semibold uppercase tracking-widest">Admin only</span></div>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Admin Login</h1>
        <p className="mt-1 text-sm text-slate-400">Doctors don't log in — they register via the event link you share.</p>
        {err && <div className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{err}</div>}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
        </form>
      </div>
    </div>
  );
}
