import { useEffect, useRef, useState } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { api } from '../api/client.js';

// Export dropdown: button -> CSV / Excel options with real file-type icons.
// `base` = path WITHOUT extension (e.g. '/admin/registrations').
export default function ExportMenu({ base, filename }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function download(ext) {
    setBusy(ext);
    try {
      const res = await api.get(`${base}.${ext}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `${filename}.${ext}`; a.click();
      URL.revokeObjectURL(url);
    } finally { setBusy(''); setOpen(false); }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn-primary py-2 text-sm">
        <Download size={16} strokeWidth={2.4} /> Export
        <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-panel/95 p-1 shadow-2xl shadow-black/60 backdrop-blur">
          <Row onClick={() => download('xlsx')} busy={busy === 'xlsx'}
            icon={<FileSpreadsheet size={18} className="text-emerald-400" strokeWidth={2} />}
            title="Excel Workbook" sub=".xlsx" />
          <Row onClick={() => download('csv')} busy={busy === 'csv'}
            icon={<FileText size={18} className="text-sky-400" strokeWidth={2} />}
            title="CSV File" sub=".csv" />
        </div>
      )}
    </div>
  );
}

function Row({ onClick, busy, icon, title, sub }) {
  return (
    <button onClick={onClick} disabled={busy}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/10 disabled:opacity-60">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/5">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-medium text-slate-100">{title}</span>
        <span className="block text-xs text-slate-500">{sub}</span>
      </span>
      {busy && <Loader2 size={16} className="animate-spin text-slate-400" />}
    </button>
  );
}
